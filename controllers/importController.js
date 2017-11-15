const CONFIG = require('dotenv').load().parsed;
const log = require('cllc')();
const debug = require('debug')('controller:import');
const Promise = require('bluebird');
const createWriteStream = require('fs').createWriteStream;
const childProcess = require('child_process');


const database = require('../models/database');
const psDatabase = database.parser;
const ocDatabase = database.opencart;

const categoryController = require('./categoryController');
const { createProgressBar, fileExists, getRandomInRange } = require('./utils');

const ocImagesPath = '/var/www/html/image/catalog/diagrams/';
const LIMIT = +(CONFIG.MAX_OPEN_DB_CONNECTIONS || 100);
const MAX_NETWORK_REQUESTS = +CONFIG.MAX_NETWORK_REQUESTS || 20;

sync()
    .then(() => {
        psDatabase.sequelize.close();
        ocDatabase.sequelize.close();
        log.i('...synchronization done');
    })
    .catch((err) => {
        log.i(err);
    });

async function sync() {

    let categoryTotal = await categoryController.count();

    global.progress = createProgressBar('synchronizing categories', categoryTotal);

    await syncCategory();
}


async function loadDiagram(diagram_url) {
    const diagramErrors = createWriteStream(`./diagram-errors.log`);
    let image = null;

    if (!!diagram_url) {

        let imageName = getImageName(diagram_url);
        let imageSavePath = ocImagesPath + imageName;

        if (await fileExists(imageSavePath)) {
            log.i(`Diagram ${imageName} already exists!`);
        } else {
            try {
                console.log(`Loading diagram: ${imageName}`);
                await downloadZoomableImage(diagram_url, imageSavePath);
            } catch (e) {
                let message = `ID: ${psSection.id}\nName: ${psSection.section}\nURL: ${psSection.diagram_url}\nError Message: ${e.message}\n\n`;
                console.log(`Error loading -  ${message}\n${e.message}`);
                diagramErrors.write(message);
            }
        }
    }
}

async function downloadZoomableImage(imageUrl, filename) {
    let port = 150 + getRandomInRange(10, 99);
    const command = `node ./dezoomify/node-app/dezoomify-node.js ${imageUrl} ${filename} ${port}`;

    await Promise.promisify(childProcess.exec)(command);
}

function getImageName(diagram_url) {

    let imageXMLPath = diagram_url
            .replace('https://','')
            .replace('http://','')
            .split('/');

    imageXMLPath.splice(0, 1);
    imageXMLPath.splice(-1, 1);

    return imageXMLPath.join('-') + '.jpg';
}

async function syncCategory(depth_level = 1) {

    return new Promise(async (resolve, reject) => {

        let psCategoryHandled = 0;
        const psCategoryTotal = await categoryController.count({ depth_level: depth_level });

        if(psCategoryTotal == 0) {
            resolve(true);
            return;
        }

        while(psCategoryHandled < psCategoryTotal) {

            //get category list from DB
            let psCategories = await psDatabase.Category.findAll({
                where: { depth_level: depth_level },
                include: [{model: psDatabase.Category, as: 'Parent'}],
                limit: LIMIT,
                offset: psCategoryHandled
            });

            //update categories in opencar db and return parser category models with opencart ids
            let categories = await updateOpencartCategories(psCategories);

            //mark categories in parser db as synchronized and go sync children in each
            await categoryController.upsertAndReturnCategories(categories, depth_level);

            progress.tick(psCategories.length);
            psCategoryHandled += psCategories.length;
        }

        syncCategory(++depth_level);
    });
}


async function updateOpencartCategories (psCategories) {

    return new Promise(async (resolve, reject) => {

        let categories = [];

        await Promise.map(psCategories, async (psCategory) => {

            let options = getCategoryOptions(psCategory);

            const ocCategory = await ocDatabase.Category.upsertAndReturn({
                name: psCategory.name
            }, options);

            let cat = psCategory.dataValues;
                cat.opencart_id = ocCategory.category_id;
                cat.sync = true;

            categories.push(cat);
        }, {
            concurrency: LIMIT
        });

        resolve(categories);
    });
}


function getCategoryOptions(psCategory) {

    let options = [];

    if(!!psCategory.Parent) {
        options.urlAlias = `${psCategory.Parent.name.toLowerCase()}-${psCategory.name}`;
        options.parentId = psCategory.Parent.opencart_id;
    }
    else {
        options.urlAlias = psCategory.name;
    }

    return options;
}


module.exports = {
    sync
};