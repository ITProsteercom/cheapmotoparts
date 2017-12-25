const ENV = require('dotenv').load().parsed;
const Promise = require('bluebird');
const log = require('cllc')();
const argv = require('yargs').argv;
const needle = require('needle');
const tress = require('tress');
const cheerio = require('cheerio');
var hash = require('object-hash');

const PARALLEL_STREAMS = +ENV.PARALLEL_STREAMS || 10;
const TIME_WAITING = +ENV.TIME_WAITING || 300000; //default 5 minutes

const { getCookiesPartshouse } = require('./authController');
const appConfig = require('./configController');
const categoryController = require('./categoryController');

const CategoryPartshouse = require('../models/database').parser.CategoryPartshouse;


//reqursive scraping with tress
var queueCategory,
    partshouseCookies = {},
    partshouseDomains = {};

async function parse() {
    log.i('Parsing data from partshouse started');

    return await loadCategories();
}

async function loadCategories() {

    log.i('Parsing categories');

    return new Promise(async function (resolve, reject) {

        log.start('Найдено категорий %s, диаграмм %s');

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

        //add make urls to query
        await Promise.map(appConfig.get('make'), async (make) => {

            let manufacturer = prepareManufacturerName(make);

            partshouseCookies[manufacturer] = await getCookiesPartshouse(manufacturer);
            partshouseDomains[manufacturer] = `https://www.${manufacturer}partshouse.com`;

            //create first depth level caterories
            let makeCategory = await upsertAndReturnCategories([{
                name: make,
                url: partshouseDomains[manufacturer],
                depth_level: 1
            }]);

            //add category to parse query
            queueCategory.push({
                url: getPartshouseMainUrl(manufacturer),
                depth_level: 1,
                id: makeCategory[0].id
            });
        });
    });
}

async function loadAndParse(item, callback) {

    //get manufacturer from parsed url
    let manufacturer = parseUrl(item.url)[0];
    //process requested url
    await needle.get(
           item.url,
           {cookies: partshouseCookies[manufacturer]},
           async function(err, res) {

               if (err || res.statusCode !== 200) {
                   log.w((err || res.statusCode) + ' - ' + item.url);
                   return callback(true); // return url at the beginning of th e turn
               }

               try {
                   //parse and save categories
                    let categories = await loadCategoriesPartshouse(res.body, item);

                    if (categories.length > 0) {
                        queueCategory.push(categories);//add next categories to query

                        log.step(categories.length);
                    }
                    else {
                        //make diagram hash
                        let products = parseProducts(res.body);
                        let diagram_hash = hash(products),
                            diagram_url = parseDiagramUrl(res.body);

                        await CategoryPartshouse.update({diagram_hash, diagram_url}, {where: {id: item.id}});
                        log.step(0, 1);
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

function parseProducts(html_page) {

    let $ = cheerio.load(html_page);
    let products = [];

    $('#partlist').find('form').each(function() {

        products.push($(this).data('sku'));
    });

    let nav = $('.crumbnav').find('a');

    return {
        make: nav.eq(0).text().toLowerCase(),
        cat: nav.eq(1).text().toLowerCase(),
        year: nav.eq(2).text().toLowerCase(),
        products: products.sort()
    };
}

function parseDiagramUrl(html_page) {

    let diagramUrl = null;

    if(!!html_page.match(/assempath\s=\s*'(\S*)'/))
        diagramUrl = html_page.match(/assempath\s=\s*'(\S*)'/)[1];

    if (diagramUrl == 'noimg/assembly.xml')
        diagramUrl = null;

    return diagramUrl;
}

/**
 * parse categories from partshouse
 *
 * @param html
 * @param parent_id
 * @returns {*}
 */
async function loadCategoriesPartshouse(html, parent_item) {

    //parse categories
    let categoriesPartshouse = parseCategoties(html, parent_item);

    if(categoriesPartshouse.length == 0)
        return [];

    //filter categories
    let depth_level = parent_item.depth_level + 1;
    let filteredCategories = categoryController.filterCategories(categoriesPartshouse, depth_level);

    //save categories to db
    return await upsertAndReturnCategories(filteredCategories, parent_item.id);
}

async function upsertAndReturnCategories(categories, parent_id = null) {

    if(categories.length <= 0)
        return [];

    return await CategoryPartshouse.upsertBulkAndReturn(categories, parent_id);
}

function parseCategoties(html_page, parent_item) {

    var $ = cheerio.load(html_page);
    var categories = [];

    var container = $('#partsselectlist'),
        partList = container.find('.partsubselect');

    if(partList.length == 0)
        partList = container.find('#partassemthumblist');

    partList.find('a').each(function(i) {

        let name = $(this).text().replace(/\sParts/, '');
        let url = $(this).attr('href');

        let manufacturer = prepareManufacturerName($('#partsselectlist').find('.crumbnav').find('a').first().text());

        categories.push({
            parent_id: parent_item.id,
            name: name,
            depth_level: parent_item.depth_level + 1,// $('#partsselectlist').find('.crumbnav').find('li').length - 1,//getDepthLevelPartshouse(url),
            url: partshouseDomains[manufacturer] + url
        });
    });

    return categories;
}

function getPartshouseMainUrl(make = '') {

    if(make.length == 0)
        return;

    return `https://www.${make}partshouse.com/oemparts/c/${make}/parts`;
}

function parseUrl(url) {

    return url.split('/').slice(-2, -1)[0].split('_');
}

function prepareManufacturerName(manufacturerName) {

    return manufacturerName.replace('-', '').replace(/\s+/g, '').toLowerCase();
}

module.exports = {
    parse
};