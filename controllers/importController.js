const CONFIG = require('dotenv').load().parsed;
const log = require('cllc')();
const debug = require('debug')('controller:import');
const path = require('path');
const Promise = require('bluebird');
const childProcess = require('child_process');

const database = require('../models/database');
const psDatabase = database.parser;
const ocDatabase = database.opencart;

const categoryController = require('./categoryController');
const { createProgressBar, fileExists, getRandomInRange } = require('./utils');

//const ocImagesPath = '/var/www/html/image/';
const ocImagesPath = 'D:/OpenServer/domains/cheapmotoparts.dev/image/';
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

    await syncProducts();
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

async function syncProducts() {

    return new Promise(async (resolve, reject) => {

        const productsTotal = await psDatabase.Product.count();

        if (!productsTotal) {
            console.log('all products have been synchronized');
            resolve(true);
        }

        const progress = createProgressBar('synchronizing products', productsTotal);
        let productsHandled = 0;
        while (productsHandled < productsTotal) {
            let products = await psDatabase.Product.findAll({
                include: [psDatabase.Category],
                limit: LIMIT,
            });

            await Promise.map(products, async(psProduct) => {
                const ocProduct = await ocDatabase.Product.upsertFromParser({
                    name: psProduct.name,
                    sku: psProduct.sku,
                    price: psProduct.price * 1.15,
                    alias: psProduct.sku,
                    manufacturer_id: psProduct.Category && psProduct.Category[0] ? psProduct.Category[0].manufacturer_id : 0
                });

                const categories = psProduct.Category.map(cat => cat.opencart_id);
                await ocDatabase.ProductToCategory.assignCategories(ocProduct, categories);
                await psProduct.update({opencart_id: ocProduct.product_id, sync: true});

                productsHandled += 1;
                progress.tick();
            });
        }
    });
}

async function loadDiagram(Category) {

    return new Promise(async (resolve, reject) => {

        let imageName = null;

        if (!!Category.diagram_url) {

            let imageName = getImageName(Category.diagram_url);
            let imageSavePath = path.join(ocImagesPath + imageName);

            if (await fileExists(imageSavePath)) {
                log.i(`Diagram ${imageName} already exists!`);
            } else {
                try {
                    console.log(`Loading diagram: ${imageName}`);
                    await downloadZoomableImage(Category.diagram_url, imageSavePath);
                } catch (e) {
                    let message = `ID: ${Category.id}\nName: ${Category.section}\nURL: ${Category.diagram_url}\nError Message: ${e.message}\n\n`;
                    reject(`Error loading -  ${message}\n${e.message}`);
                }
            }
        }

        resolve(imageName);
    });
}

async function downloadZoomableImage(imageUrl, filename) {
    let port = '150' + getRandomInRange(10, 99);
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
    
    let filename = '';
    if(imageXMLPath.length)
        filename = imageXMLPath.join('-') + '.jpg';
    else
        filename = 'noimg.img';

    return path.join('catalog/diagrams/', filename);
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

    if(!!psCategory.diagram_url) {
        options.image = loadDiagram(psCategory);
    }

    return options;
}


module.exports = {
    sync
};