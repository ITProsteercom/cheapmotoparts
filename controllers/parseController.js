'use strict';

const ENV = require('dotenv').load().parsed;
const config = require('../config/config.js');
const debug = require('debug')('controller:parse');
const log = require('cllc')();
const cheerio = require('cheerio');
const needle = require('needle');
const tress = require('tress');
const hash = require('object-hash');
const Promise = require('bluebird');
const { createProgressBar } = require('./utils');

const authController = require('./authController');
const categoryController = require('./categoryController');
const productController = require('./productController');
const productToCategoryController = require('./productToCategoryController');

const Category = require('../models/database').parser.Category;

var appConfig = require('./configController');

const PARALLEL_STREAMS = +ENV.PARALLEL_STREAMS || 10;
const TIME_WAITING = +ENV.TIME_WAITING || 300000; //default 5 minutes
const MAX_OPEN_DB_CONNECTIONS = +ENV.MAX_OPEN_DB_CONNECTIONS || 100;

var cookiePartzilla;
var queueCategory;
var progress;

async function load() {
    log.i('Parsing data from partzilla started');

    cookiePartzilla = await getCookiePartzilla();

    if(appConfig.get('parse').includes('category')) {
        await loadCategories();
    }

    if(appConfig.get('parse').includes('products')) {
        await loadProducts();
    }

    log.i('...complited!');
}

async function getCookiePartzilla() {
    return await authController.authPartzilla(config['partzilla']);
}

async function loadCategories(url = '/catalog') {

    log.i('Parsing categories');

    return new Promise(async function (resolve, reject) {

        log.start('Найдено категорий %s');

        //reqursive scraping with tress
        queueCategory = tress(loadAndParse, PARALLEL_STREAMS); // run N parallel streams

        queueCategory.drain = function () {
            log.finish();
            log.i('...completed!');
            resolve(true);
        };

        queueCategory.retry = function () {
            queueCategory.pause();
            // this - task returned to the turn
            log.i('Paused on:', this.url);
            setTimeout(() => {
                queueCategory.resume();
                log.i('Resumed');
            }, TIME_WAITING); // N minutes waiting
        };

        //add initial url to query
        queueCategory.push({
            url: url,
            id: null
        });
    });
}

async function loadAndParse(item, callback) {

    //process requested url
    await needle.get(
        config["partzilla"]["url"] + item.url,
        {cookies: cookiePartzilla},
        async function(err, res) {

            if (err || res.statusCode !== 200) {
                log.w((err || res.statusCode) + ' - ' + item.url);
                return callback(true); // return url at the beginning of th e turn
            }

            try {
                //parse and save categories
                let categories = await categoryController.loadCategories(res.body, item.id);

                if (categories.length > 0) {
                    if(categories[0].depth_level < 5)
                        queueCategory.push(categories);//add next categories to query

                    log.step(categories.length);
                }

                callback(); //call callback in the end
            }
            catch(err) {
                log.w(err);
                //if any error retry
                return callback(true);
            }
        });
}

async function loadProducts() {

    log.i('Parsing products');

    return new Promise(async function (resolve, reject) {

        var queueProducts = await tress(parseProducts, PARALLEL_STREAMS); // run N parallel streams

        queueProducts.drain = function () {

            log.i('...completed!');
            resolve(false);
        };

        queueProducts.retry = function () {
            queueProducts.pause();
            // this - task returned to the turn
            log.i('Paused on:', this.url);
            setTimeout(() => {
                queueProducts.resume();
                log.i('Resumed');
            }, TIME_WAITING); // N minutes waiting
        };

        //parsing and pushing components urls to query
        await parseComponents(queueProducts);
    });
}

async function parseComponents(queue) {

    let componentsHandled = 0;
    let componentsTotal = await categoryController.count({where: {depth_level: 5}});

    progress = createProgressBar('handle products in component categories', componentsTotal);

    while(componentsHandled < componentsTotal) {

        let componentsList = await categoryController.getList({where: {depth_level: 5}}, MAX_OPEN_DB_CONNECTIONS, componentsHandled);

        await Promise.map(componentsList, (component) => {

            queue.push({
                url:component.url,
                id: component.id
            });

        });
        componentsHandled += MAX_OPEN_DB_CONNECTIONS;
    }
}

async function parseProducts(item, callback) {

    await needle.get(
        config["partzilla"]["url"] + item.url,
        {cookies: cookiePartzilla},
        async function(err, res) {

            if (err || res.statusCode !== 200) {
                log.w((err || res.statusCode) + ' - ' + item.url);
                return callback(true); // return url at the beginning of th e turn
            }

            try {
                //parse and save products
                let products = await productController.loadProducts(res.body);
                //add products to categories associations
                await productToCategoryController.saveProductsToCategory(products, item.id);

                //update diagram hash of category
                let diagram_hash = getDiagramHash(res.body, products);
                await Category.update({diagram_hash}, {where: {id: item.id}});

                progress.tick();
                callback();
            }
            catch (err) {
                log.w(err);
                return callback(true); //if any error retry
            }
        });
}

function getDiagramHash(html_page, products) {

    let $ = cheerio.load(html_page),
        nav = $('.breadcrumb').find('a'),
        productsSku = products.map(product => product.sku);

    return hash({
        make: nav.eq(1).text().toLowerCase(),
        cat: nav.eq(2).text().toLowerCase(),
        year: nav.eq(3).text().toLowerCase(),
        products: productsSku.sort()
    });
}

module.exports = {
    load
};