const ENV = require('dotenv').load().parsed;
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

const ocImagesPath = ENV.OC_IMAGES_PATH || '/var/www/html/image/';
const MAX_OPEN_DB_CONNECTIONS = +ENV.MAX_OPEN_DB_CONNECTIONS || 100;
const MAX_NETWORK_REQUESTS = +ENV.MAX_NETWORK_REQUESTS || 20;

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

    await syncDiagrams();

    await syncManufacturers();

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
                limit: MAX_OPEN_DB_CONNECTIONS,
                offset: psCategoryHandled
            });

            //update categories in opencar db and return parser category models with opencart ids
            let categories = await updateOpencartCategories(psCategories);

            //mark categories in parser db as synchronized and go sync children in each
            await categoryController.upsertAndReturnCategories(categories, depth_level);

            progress.tick(psCategories.length);
            psCategoryHandled += psCategories.length;
        }
        resolve(true);
        syncCategory(++depth_level);
    });
}

async function syncDiagrams() {

    return new Promise(async (resolve, reject) => {

        const componentsTotal = await psDatabase.Category.count({
            where: {
                depth_level: 5,
                diagram_url: {$ne: null},
                opencart_id: {$ne: null}
            }
        });

        if (!componentsTotal) {
            log.i('all diagrams have been synchronized');
            resolve(true);
        }

        let componentsHandled = 0;
        const progress = createProgressBar('synchronizing diagrams', componentsTotal);

        do {
            //get from parser DB component list with diagrams and sync with opencart DB
            let psCategories = await psDatabase.Category.findAll({
                where: {
                    depth_level: 5,
                    diagram_url: {$ne: null},
                    opencart_id: {$ne: null}
                },
                limit: MAX_OPEN_DB_CONNECTIONS,
                offset: componentsHandled
            });

            if (!psCategories.length) {
                log.i('all diagrams have been synchronized');
                resolve(true);
            }

            await Promise.map(psCategories, async (psCategory) => {

                let image = await loadDiagram(psCategory);

                let ocCategory = await ocDatabase.Category.findById(psCategory.opencart_id);

                ocCategory.update({ image });

                componentsHandled += 1;
                progress.tick();
            }, {
                concurrency: MAX_NETWORK_REQUESTS
            });

        } while(componentsHandled <= componentsTotal)
    })
}

async function syncManufacturers() {

    return new Promise(async (resolve, reject) => {

        let psManufacturers = psDatabase.Category.findAll({
            where: { depth_level: 1 }
        });

        let ocManufacturers = await ocDatabase.Manufacturer.findAll();

        await Promise.map(psManufacturers, async (psManufacturer) => {

            let result = ocManufacturers.filter(ocManufacturer => ocManufacturer.name == psManufacturer.name);
            if(!result.length) {
                await ocDatabase.Manufacturer.create({name: psManufacturer.name});
            }
        });
        log.i('all manufacturers have been synchronized');
        resolve(true);
    });
}

async function syncProducts() {

    return new Promise(async (resolve, reject) => {

        const productsTotal = await psDatabase.Product.count();

        if (!productsTotal) {
            log.i('all products have been synchronized');
            resolve(true);
        }

        const progress = createProgressBar('synchronizing products', productsTotal);
        let productsHandled = 0;
        while (productsHandled < productsTotal) {
            let products = await psDatabase.Product.findAll({
                include: [psDatabase.Category],
                limit: MAX_OPEN_DB_CONNECTIONS
            });

            await Promise.map(products, async(psProduct) => {
                let manufacturerName = psProduct.url.slice(1).split('/')[1];
                let ocManufacturer = ocDatabase.Manufacturer.findAll({where: {name: manufacturerName}});

                const ocProduct = await ocDatabase.Product.upsertFromParser({
                    name: psProduct.name,
                    sku: psProduct.sku,
                    price: psProduct.price * 1.15,
                    alias: psProduct.sku,
                    manufacturer_id: ocManufacturer ? ocManufacturer.manufacturer_id : 0
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
                    debug(`Loading diagram: ${imageName}`);
                    await downloadZoomableImage(Category.diagram_url, imageSavePath);
                } catch (e) {
                    let message = `ID: ${Category.id}\nName: ${Category.name}\nURL: ${Category.diagram_url}\nError Message: ${e.message}\n\n`;
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
            concurrency: MAX_OPEN_DB_CONNECTIONS
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