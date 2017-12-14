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

var appConfig = require('./configController');

const MAX_OPEN_DB_CONNECTIONS = +ENV.MAX_OPEN_DB_CONNECTIONS || 100;
const MAX_DIAGRAM_REQUESTS = +ENV.MAX_DIAGRAM_REQUESTS || 20;


async function run() {

    log.i('Importing data to opencart started');

    return new Promise(async (resolve, reject) => {

        await sync()
            .then(() => {
                psDatabase.sequelize.close();
                ocDatabase.sequelize.close();
                log.i('...import completed!');
                resolve(true);
            })
            .catch((err) => {
                log.i(err);
            });
    });
}

async function sync() {

    if(appConfig.get('sync').includes('category')) {
        await syncCategories();
    }

    if(appConfig.get('sync').includes('diagrams')) {
        await syncDiagrams();
    }

    if(appConfig.get('sync').includes('make')) {
        await syncManufacturers();
    }

    if(appConfig.get('sync').includes('products')) {
        await syncProducts();
    }
}

async function syncCategories() {

    await syncCategoryLevel();
    log.i('...categories synchronization was completed successfully');
}

async function syncCategoryLevel(depth_level = 1) {

    return new Promise(async (resolve, reject) => {

        try {
            let psCategoryHandled = 0;
            const psCategoryTotal = await categoryController.count({where: { depth_level: depth_level }});
            let progress = createProgressBar('synchronizing categories of depth_level '+depth_level, psCategoryTotal);

            if(psCategoryTotal == 0) {
                resolve(true);
                return;
            }

            while(psCategoryHandled < psCategoryTotal) {

                //get category list from DB
                let psCategories = await categoryController.getList({where: { depth_level: depth_level }}, MAX_OPEN_DB_CONNECTIONS, psCategoryHandled);

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
            const componentsTotal = await categoryController.count({
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
                let psCategories = await categoryController.getList({
                        where: {
                            depth_level: 5,
                            diagram_url: {$ne: null},
                            opencart_id: {$ne: null}
                        }
                    },
                    MAX_OPEN_DB_CONNECTIONS,
                    componentsHandled
                );

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

        let psManufacturers = await categoryController.getList({where: {depth_level: 1}});

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

            let componentsHandled = 0;
            let componentsTotal = await categoryController.count({where: {depth_level: 5}});

            let productsCount = 0;

            let progress = createProgressBar('synchronizing products in component categories', componentsTotal);

            while(componentsHandled < componentsTotal) {

                let componentsList = await categoryController.getList({
                        where: {depth_level: 5},
                        include: {
                            model: psDatabase.Product,
                            as: 'Products',
                            include: [psDatabase.Category]
                        }
                    }, 
                    MAX_OPEN_DB_CONNECTIONS,
                    componentsHandled
                );

                await Promise.map(componentsList, async (component) => {

                    await updateComponentProducts(component.Products);

                    componentsHandled += 1;
                    productsCount += component.Products.length;
                    progress.tick();
                }, {
                    concurrency: MAX_OPEN_DB_CONNECTIONS
                });
            }

            log.i('... products synchronization was completed successfully');
            log.i('Products synchronized: ' + productsCount);
            resolve(true);
        }
        catch (err) {
            reject(err);
        }
    });
}

async function updateComponentProducts(products) {

    return new Promise(async (resolve, reject) => {

        if(typeof products !== 'undefined') {
            //console.log('updateComponentProducts');
            await Promise.map(products, async (psProduct)=> {

                //parse manufacturer name from product url
                let manufacturerName = psProduct.url.slice(1).split('/')[1];

                let ocManufacturer = await ocDatabase.Manufacturer.findOne({where: {name: manufacturerName}});

                let ocProduct = await ocDatabase.Product.upsertFromParser({
                    name: psProduct.name,
                    sku: psProduct.sku,
                    price: psProduct.price * 1.15,
                    alias: psProduct.sku,
                    manufacturer_id: ocManufacturer ? ocManufacturer.manufacturer_id : 0
                });

                await ocProduct.assignCategories(psProduct.Categories);
                await psProduct.update({opencart_id: ocProduct.product_id, sync: true});
            });

            resolve(true);
        }
        else{
            resolve(true);
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

    let options = {
        urlAlias: psCategory.name
    };

    if(!!psCategory.Parent)
        options.parentId = psCategory.Parent.opencart_id;

    return options;
}


module.exports = {
    run
};