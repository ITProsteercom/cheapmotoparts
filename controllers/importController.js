const ENV = require('dotenv').load().parsed;
const log = require('cllc')();
const debug = require('debug')('controller:import');
const Promise = require('bluebird');

const database = require('../models/database');
const psDatabase = database.parser;
const ocDatabase = database.opencart;

const categoryController = require('./categoryController');
const diagramController = require('./diagramController');
const { createProgressBar } = require('./utils');

const MAX_OPEN_DB_CONNECTIONS = +ENV.MAX_OPEN_DB_CONNECTIONS || 100;
const MAX_DIAGRAM_REQUESTS = +ENV.MAX_DIAGRAM_REQUESTS || 20;


async function run(import_steps = ['category', 'diagram', 'make', 'product']) {

    log.i('Importing data to opencart started');

    return new Promise(async (resolve, reject) => {

        await sync(import_steps)
            .then(() => {
                psDatabase.sequelize.close();
                ocDatabase.sequelize.close();
                log.i('...completed!');
                resolve(true);
            })
            .catch((err) => {
                log.i(err);
            });
    });


}

async function sync(import_steps) {

    if(import_steps.includes('category')) {
        await syncCategory();
    }
    else if(import_steps.includes('diagram')) {
        await syncDiagrams();
    }
    else if(import_steps.includes('make')) {
        await syncManufacturers();
    }
    else if(import_steps.includes('product')) {
        await syncProducts();
    }
}

async function syncCategory() {

    let categoryTotal = await categoryController.count();
    global.progress = createProgressBar('synchronizing categories', categoryTotal);

    await syncCategoryLevel();
    log.i('...categories synchronization was completed successfully');
}

async function syncCategoryLevel(depth_level = 1) {

    return new Promise(async (resolve, reject) => {

        try {
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

            await syncCategoryLevel(++depth_level);
            resolve(true);
        }
        catch(err) {
            reject(err);
        }
    });
}

async function syncDiagrams() {

    return new Promise(async (resolve, reject) => {

        try {
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

            while(componentsHandled < componentsTotal) {
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

                await Promise.map(psCategories, async (psCategory) => {

                    let image = await diagramController.loadDiagram(psCategory);

                    let ocCategory = await ocDatabase.Category.findById(psCategory.opencart_id);

                    await ocCategory.update({ image });

                    componentsHandled += 1;
                    progress.tick();
                }, {
                    concurrency: MAX_DIAGRAM_REQUESTS
                });
            }

            log.i('...diagrams synchronization was completed successfully');
            resolve(true);
        }
        catch(err) {
            reject(err);
        }
    });
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
        log.i('...manufacturers synchronization was completed successfully');
        resolve(true);
    });
}

async function syncProducts() {

    return new Promise(async (resolve, reject) => {

        try {
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
                    limit: MAX_OPEN_DB_CONNECTIONS,
                    offset: productsHandled
                });

                await Promise.map(products, async (psProduct) => {
                    //parse manufacturer name from product url
                    let manufacturerName = psProduct.url.slice(1).split('/')[1];

                    let ocManufacturer = await ocDatabase.Manufacturer.findAll({where: {name: manufacturerName}});

                    let ocProduct = await ocDatabase.Product.upsertFromParser({
                        name: psProduct.name,
                        sku: psProduct.sku,
                        price: psProduct.price * 1.15,
                        alias: psProduct.sku,
                        manufacturer_id: ocManufacturer ? ocManufacturer.manufacturer_id : 0
                    });
                    await ocProduct.assignCategories(psProduct.Categories);
                    await psProduct.update({opencart_id: ocProduct.product_id, sync: true});

                    productsHandled += 1;
                    progress.tick();
                }, {
                    concurrency: MAX_OPEN_DB_CONNECTIONS
                });
            }
            log.i('...products synchronization was completed successfully');
            resolve(true);
        }
        catch (err) {
            reject(err);
        }
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
            concurrency: MAX_OPEN_DB_CONNECTIONS
        });

        resolve(categories);
    });
}


function getCategoryOptions(psCategory) {

    let options = [];

    if(!!psCategory.Parent) {
        //options.urlAlias = `${psCategory.Parent.name}-${psCategory.name}`;
        options.urlAlias = `${psCategory.name}-${psCategory.opencart_id}`;
        options.parentId = psCategory.Parent.opencart_id;
    }
    else {
        options.urlAlias = psCategory.name;
    }

    return options;
}


module.exports = {
    run
};