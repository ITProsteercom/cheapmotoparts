const ENV = require('dotenv').load().parsed;
const cheerio = require('cheerio');
const debug = require('debug')('controller:diagram');
const log = require('cllc')();
const needle = require('needle');
const tress = require('tress');
const Promise = require("bluebird");
const path = require('path');
const childProcess = require('child_process');
const fs = require('fs');

const authController = require('./authController');
const categoryController = require('./categoryController');
const { fileExists, getRandomInRange } = require('./utils');

const CategoryPartshouse = require('../models/database').parser.CategoryPartshouse;

const PARALLEL_STREAMS = +ENV.PARALLEL_STREAMS || 10;
const MAX_OPEN_DB_CONNECTIONS = +ENV.MAX_OPEN_DB_CONNECTIONS || 100;
const TIME_WAITING = +ENV.TIME_WAITING || 300000; //default 5 minutes
const ocImagesPath = ENV.OC_IMAGES_PATH || '/var/www/html/image/';

var q;
var componentsToUpdate = [];

async function parse() {

    log.i('Parsing diagrams from partshouse started');

    clearLogFiles();

    return new Promise(async (resolve, reject) => {

        q = tress(queryParsingCallback, PARALLEL_STREAMS);// 5 parallel streams

        q.retry = function () {
            q.pause();
            // this - task returned to the turn
            log.i('Paused on:', this.url);
            setTimeout(function () {
                q.resume();
                log.i('Resumed');
            }, TIME_WAITING);
        };

        q.drain = async function () {

            //update categories left after process
            if (componentsToUpdate.length) {
                await categoryController.updateCategories(componentsToUpdate);
            }

            log.finish();
            log.i('...completed!');

            resolve(true);
        };

        q.success = async function () {

            //update categories if count more than MAX_OPEN_DB_CONNECTIONS
            if (componentsToUpdate.length >= MAX_OPEN_DB_CONNECTIONS) {
                await categoryController.updateCategories(componentsToUpdate);
                componentsToUpdate = [];
            }
        };

        log.i('Start processing data');
        log.start('Обработано моделей %s, Обработано компонентов %s, Обработано диаграмм %s.');

        await parseDiagrams();
    });
}

async function queryParsingCallback(params, callback) {

    try {
        if (params.step == 'models') {
            await processModels(params);
            return callback();
        }
        else if (params.step == 'components') {
            await processComponents(params)
            return callback();
        }
        else if (params.step == 'diagram') {

            await processDiagram(params);
            return callback();
        }

    } catch (e) {
        log.e(e.message);
        return callback(true);
    }
}

async function processYears(params) {
    //get categories of current manufacturer
    let categories = await categoryController.getList({where: {depth_level: 2, parent_id: params.make.id}});

    await Promise.map(categories, async (category) => {

        //get years of current category
        let years = await categoryController.getList({where: {depth_level: 3, parent_id: category.id}});

        await Promise.map(years, async (year) => {

            debug('add ' + getPartshouseUrl([params.make.name, category.name, year.name]) + ' to query');

            q.push({
                step: 'models',
                url: getPartshouseUrl([params.make.name, category.name, year.name]),
                cookies: params.cookies,
                make: params.make,
                cat: category,
                year: year
            });
        });
    });
}

async function processModels(params) {

    let partshouseModels = await getPartshouseModels(params.url, params.cookies);
    // let partzillaModels = await categoryController.getChildrenList(params.year.id);
    let partzillaModels = await categoryController.getList({where: {depth_level: 4, parent_id: params.year.id}});

    //sort by name and name length for next comparison
    partshouseModels = sotrByLengthThenName(partshouseModels);
    partzillaModels = sotrByLengthThenName(partzillaModels);

    await Promise.map(partzillaModels, async (partzillaModel) => {

        //search intersection and return index of best match
        let index = findSimilarInParthouse(partzillaModel.name, partshouseModels);

        //if match was not found
        if(index < 0) {
            // write to log
            let message = `ID: ${partzillaModel.id}\nName: ${partzillaModel.name}\nOPENCART ID: ${partzillaModel.opencart_id}\n\n`;
            fs.appendFileSync('./tmp/component-errors.log', message);
        }
        //if match was found
        else {
            let partshouseModel = partshouseModels[index];

            debug('add ' + getPartshouseUrl([params.make.name]) + partshouseModel.url + ' to query');

            q.push({
                step: 'components',
                url: getPartshouseUrl([params.make.name]) + partshouseModel.url,
                cookies: params.cookies,
                make: params.make,
                year: params.year,
                model: partzillaModel
            });

            //remove from source array to exclude further same match found
            partshouseModels.splice(index, 1);
        }

        log.step(1);
    });
}

async function processComponents(params) {

    let partshouseComponents = await getPartshouseComponents(params.url, params.cookies);

    // let partzillaComponents = await categoryController.getChildrenList(params.model.id);
    let partzillaComponents = await categoryController.getList({where: {depth_level: 5, parent_id: params.model.id}});

    //sort by name length for next comparison
    partshouseComponents = sotrByLengthThenName(partshouseComponents);
    partzillaComponents = sotrByLengthThenName(partzillaComponents);

    await Promise.map(partzillaComponents, async (partzillaComponent) => {

        //search intersection and return index of best match
        let index = findSimilarInParthouse(partzillaComponent.name, partshouseComponents);

        //if match was not found
        if(index < 0) {
            // write to log
            let message = `ID: ${partzillaComponent.id}\nName: ${partzillaComponent.name}\nDIAGRAM URL: ${partzillaComponent.url}\nOPENCART ID: ${partzillaComponent.opencart_id}\n\n`;
            fs.appendFileSync('./tmp/component-errors.log', message);
        }
        //if match was found
        else {
            let partshouseComponent = partshouseComponents[index];

            debug('add ' + getPartshouseUrl([params.make.name]) + partshouseComponent.url + ' to query');

            q.push({
                step: 'diagram',
                url: getPartshouseUrl([params.make.name]) + partshouseComponent.url,
                cookies: params.cookies,
                make: params.make,
                year: params.year,
                model: params.model,
                component: partzillaComponent
            });

            //remove from source array to exlude further same match found
            partshouseComponents.splice(index, 1);
        }

        log.step(0, 1);
    });
}

async function processDiagram(params) {

    let component = params.component.dataValues;
    debug('parse diagram for ' + params.make.name + ' ' + params.model.name + ' ' + params.component.name);
    component.diagram_url = await parseDiagramUrl(params.url, params.cookies);
    componentsToUpdate.push(component);
    log.step(0, 0, 1);
}

async function parseDiagrams() {

    //get list of Manufacturers
    let manufacturers = await categoryController.getMakeList();

    await Promise.map(manufacturers, async (manufacturer) => {

        try {
            //get cookies for {manufacturer}partshouse.com site or throw Error if not found
            const cookies = await authController.getCookiesPartshouse(manufacturer.name);

            //process manufacturer's year section
            await processYears({
                cookies: cookies,
                make: manufacturer
            });
        }
        catch (e) {
            log.w(e);
        }
    });
}

function getPartshouseUrl(path = []) {

    if (path.length == 0)
        return;

    //prepare url path section chain from names
    let preparedPath = path.map((pathSection) => {
        return pathSection
            .replace('-', '')
            .replace(/\s+/g, '')
            .toLowerCase();
    });

    if (path.length == 1)
        return 'https://www.' + preparedPath[0] + 'partshouse.com';
    else
        return 'https://www.' + preparedPath[0] + 'partshouse.com/oemparts/c/' + preparedPath.join('_') + '/parts';
}

async function getPartshouseModels(url, cookies) {

    return new Promise((resolve, reject) => {

        needle.get(url, {cookies: cookies}, async (err, res) => {
            if (err) return reject(err);

            return resolve(await parseModels(res.body));
        });
    });
}

async function getPartshouseComponents(url, cookies) {

    return new Promise((resolve, reject) => {

        needle.get(url, {cookies: cookies}, async (err, res) => {
            if (err) return reject(err);

            return resolve(await parseComponents(res.body));
        });
    });
}

async function parseComponents(html_page) {
    const $ = await cheerio.load(html_page);

    const components = [];

    $('#partassemthumblist .passemname a').each((i, el) => {
        components.push({
            name: $(el).text(),
            url: $(el).attr('href')
        });
    });

    return components;
}

async function parseModels(html_page) {

    const $ = await cheerio.load(html_page);

    const models = [];

    $('ul.partsubselect li a').each((i, el) => {

        models.push({
            name: $(el).text(),
            url: $(el).attr('href')
        });
    });

    return models;
}

async function parseDiagramUrl(url, cookies) {

    return new Promise((resolve, reject) => {

        needle.get(url, {cookies: cookies}, (err, res) => {

            if (err)
                return reject(err);

            let diagramUrl = null;

            if(!!res.body.match(/assempath\s=\s*'(\S*)'/))
                diagramUrl = res.body.match(/assempath\s=\s*'(\S*)'/)[1];

            if (diagramUrl == 'noimg/assembly.xml')
                diagramUrl = null;

            return resolve(diagramUrl);
        });
    });
}

/**
 * Remove all non-digit and non-letter symbols from name and convert to lower case
 *
 * @param name
 * @returns {string}
 */
function prepareSectionName(name) {

    return name.replace(/\W/g, ' ')
        .replace('-', '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * Callback sorting objects by name length
 *
 * @param a
 * @param b
 * @returns {number}
 */
function sortDescByNameLength(aName, bName) {

    aName = prepareSectionName(aName.name);
    bName = prepareSectionName(bName.name);

    if (aName.length > bName.length)
        return -1;
    if (aName.length < bName.length)
        return 1;

    return 0;
}

/**
 * Callback sorting objects by name
 *
 * @param a
 * @param b
 * @returns {number}
 */
function sortDescByName(aName, bName) {

    aName = prepareSectionName(aName.name);
    bName = prepareSectionName(bName.name);

    if (aName > bName)
        return -1;
    if (aName < bName)
        return 1;

    return 0;
}

/**
 * Sort array of object firstly by name length the by names itself
 * @param arr
 * @returns {Array}
 */
function sotrByLengthThenName(arr) {

    arr.sort(sortDescByNameLength);

    let groupedByNameLength = {};
    arr.map((el) => {

        let elName = prepareSectionName(el.name);

        if(typeof groupedByNameLength[elName.length] === 'undefined')
            groupedByNameLength[elName.length] = [el];
        else
            groupedByNameLength[elName.length].push(el);
    });

    let result = [];
    Object.keys(groupedByNameLength).forEach((length) => {
        groupedByNameLength[length].sort(sortDescByName);

        groupedByNameLength[length].forEach(el => result.unshift(el));
    });

    return result;
}

/**
 * Find index of best match of partzilla section in partshouse section list
 * Return index or -1 if does not find
 *
 * @param partzillaSectionName
 * @param partshouseSectionList
 * @returns {*|number}
 */
function findSimilarInParthouse(partzillaSectionName, partshouseSectionList) {

    partzillaSectionName = prepareSectionName(partzillaSectionName);

    return partshouseSectionList.findIndex((partshouseSection) => {
        let partshouseSectionName = prepareSectionName(partshouseSection.name);

        return intersect(partzillaSectionName, partshouseSectionName);
    });
}

/**
 * Check if input names intersect each other
 *
 * @param partzillaName
 * @param partshouseName
 * @returns {boolean}
 */
function intersect(partzillaName, partshouseName) {

    switch (true) {
        case(partzillaName == partshouseName):
        case(partzillaName.indexOf(partshouseName) != -1):
        case(partshouseName.indexOf(partzillaName) != -1):
            return true;
        default:
            return defaultIntersect(partzillaName, partshouseName);
        break;
    }

    return false;
}

/**
 * find intersection in complicated cases
 * for example 'HAYABUSA - GSX1300RAL7' and 'GSX1300R-A'
 *
 * @param leftName
 * @param rightName
 * @returns {boolean}
 */
function defaultIntersect(leftName, rightName) {

    //prepare names and make arrays
    let leftNameSplited = prepareSectionName(leftName).split(' ');
    let rightNameSplited = prepareSectionName(rightName).split(' ');

    //find intersection of left name parts in right name
    let leftIntersect = leftNameSplited.filter((leftPart) => {
        let lf = rightNameSplited.filter((rightPart) => {
            return rightPart.indexOf(leftPart) >= 0;
        });

        return lf.length > 0;
    });

    // find intersection of right name parts in left name
    let rightIntersect = rightNameSplited.filter((rightPart) => {
        let rt =  leftNameSplited.filter((leftPart) => {
            return leftPart.indexOf(rightPart) >= 0;
        });

        return rt.length > 0;
    });

    // get min length of name parts array
    let minlength = [leftNameSplited, rightNameSplited].reduce((prev, curr) => {
        return prev.length > curr.length ? curr.length : prev.length;
    });

    // check if intersect by at list minimum cases
    if(leftIntersect.length >= minlength || rightIntersect.length >= minlength)
        return true;

    return false;
}

async function loadDiagram(Category) {

    return new Promise(async (resolve, reject) => {

        let imageName = null;

        if (!!Category.diagram_hash) {

            //get diagram_url from partshouse categories bu diagram hash
            let diagram_url = await getDiagramUrl(Category.diagram_hash);

            if(!!diagram_url) {

                imageName = getImageName(diagram_url);
                let imageSavePath = path.join(ocImagesPath + imageName);

                if (await fileExists(imageSavePath)) {
                    debug(`Diagram ${imageName} already exists!`);
                } else {
                    try {
                        debug(`Loading diagram: ${imageName}`);
                        await downloadZoomableImage(diagram_url, imageSavePath);
                        resolve(imageName);
                    } catch (e) {
                        let message = `ID: ${Category.id}\nName: ${Category.name}\nURL: ${diagram_url}\nError Message: ${e.message}\n\n`;
                        log.w(`Error loading -  ${message}\n${e.message}`);
                        fs.appendFileSync('./tmp/diagrams-errors.log', message);
                    }
                }
            }
        }

        resolve(imageName);
    });
}

async function getDiagramUrl(diagram_hash) {

    let categoryList = await CategoryPartshouse.findAll({where: {depth_level: 5, diagram_hash: diagram_hash}});

    if(categoryList.length == 0)
        return null;

    return categoryList[0].diagram_url;
}

async function downloadZoomableImage(imageUrl, filename) {

    return new Promise(async (resolve, reject) => {

        try {
            let port = '150' + getRandomInRange(10, 99);
            const command = `node ./dezoomify/node-app/dezoomify-node.js ${imageUrl} ${filename} ${port}`;

            await Promise.promisify(childProcess.exec)(command);

            resolve(true);
        }
        catch( err ) {
            reject(err);
        }
    });
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

function clearLogFiles() {

    if (fs.existsSync('./tmp/model-errors.log'))
        fs.unlinkSync('./tmp/model-errors.log');

    if (fs.existsSync('./tmp/component-errors.log'))
        fs.unlinkSync('./tmp/component-errors.log');

    if (fs.existsSync('./tmp/diagrams-errors.log'))
        fs.unlinkSync('./tmp/diagrams-errors.log');
}

module.exports = {
    parse,
    loadDiagram
};