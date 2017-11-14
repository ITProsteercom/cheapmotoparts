const CONFIG = require('dotenv').load().parsed;
const log = require('cllc')();
const debug = require('debug')('controller:import');
const Promise = require('bluebird');

const database = require('../models/database');
const psDatabase = database.parser;
const ocDatabase = database.opencart;

const categoryController = require('./categoryController');

const ocImagesPath = '/var/www/html/image/';
const MAX_OPEN_DB_CONNECTIONS = +(CONFIG.MAX_OPEN_DB_CONNECTIONS || 100);
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

    //  Manufacturers
    let makes = await syncMake();
    console.log(makes);
}

async function syncMake() {

    return new Promise(async (resolve, reject) => {

        //get not sync manufacturers from DB
        let psMakes = await categoryController.getMakeList({sync: false});

        if(psMakes.length == 0) {
            log.i('manufacturer categories already synchronized');
            return resolve(true);
        }

        //log.i('sync manufacturer categories');
        log.start('Synchronized %s manufacturers!');
        let makes = [];
        await Promise.map(psMakes, async (psMake) => {

            const ocMake = await ocDatabase.Category.upsertAndReturn({
                name: psMake.name
            }, {
                urlAlias: `${psMake.name.toLowerCase()}`
            });

            let make = psMake.dataValues;
                make.opencart_id = ocMake.category_id;
                make.sync = true;

            makes.push(make);
            log.step(1);
        });

        //mark makes in parser db as synchronized
        resolve(await categoryController.upsertAndReturnCategories(makes, null));
    });
}

async function syncCategory(category) {

    return new Promise(async (resolve, reject) => {

        //get not sync categories from DB
        let psCategories = await categoryController.getChildrenList(category.id, { sync: false });

        if(psCategories.length == 0) {
            log.i('categories already synchronized');
            return resolve(true);
        }

        let categories = [];
        await Promise.map(psCategories, async (psCategory) => {

            let urlAlias = `${category.name.toLowerCase()}-${psCategory.name}`;
            let parentId = category.opencart_id;

            const ocCategory = await ocDatabase.Category.upsertAndReturn({
                name: psCategory.name
            }, {parentId, urlAlias});

            let cat = psCategory.dataValues;
            cat.opencart_id = ocCategory.category_id;
            cat.sync = true;

            categories.push(cat);
        });

        //mark categories in parser db as synchronized
        resolve(await categoryController.upsertAndReturnCategories(categories, null));
    });
}


module.exports = {
    sync
};