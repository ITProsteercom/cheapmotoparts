const ENV = require('dotenv').load().parsed;
const cheerio = require('cheerio');
const debug = require('debug')('controller:diagram');
const log = require('cllc')();
const needle = require('needle');
const tress = require('tress');
var Promise = require("bluebird");

const db = require('../models/database').parser;

const authController = require('./authController');
const categoryController = require('./categoryController');

const { intersect } = require('./utils');

const PARALLEL_STREAMS = +ENV.PARALLEL_STREAMS || 10;
const TIME_WAITING = +ENV.TIME_WAITING || 300000; //default 5 minutes

parse();

async function parse() {

    var componentsToUpdate = [];
    var q = tress(queryParsingCallback, PARALLEL_STREAMS);// 5 parallel streams

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

        if(componentsToUpdate.length) {
            await categoryController.updateCategories(componentsToUpdate);
        }

        log.finish();
        log.i('...finish processing data');

        db.sequelize.close();
    };

    q.success = async function() {

        let limit = 1000;

        if(componentsToUpdate.length >= limit) {
            await categoryController.updateCategories(componentsToUpdate);
            componentsToUpdate = [];
        }
    };

    log.i('Start processing data');
    log.start('Обработано моделей %s, Обработано компонентов %s, Обработано диаграмм %s.');

    await parseDiagrams();

    async function queryParsingCallback(params, callback) {
        try {
            if(params.step == 'models') {
                await processModels(params);
                return callback();
            }
            else if(params.step == 'components') {
                await processComponents(params)
                return callback();
            }
            else if(params.step == 'diagram') {

                await processDiagram(params);
                return callback();
            }

        } catch(e) {
            log.e(e.message);
            return callback(true);
        }
    }

    async function processYears(params) {
        //get categories of current manufacturer
        let categories = await categoryController.getChildrenList(params.make.id);

        await Promise.map(categories, async (category) => {

            //get years of current category
            let years = await categoryController.getChildrenList(category.id);

            await Promise.map(years, async(year) => {

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
        let partzillaModels = await categoryController.getChildrenList(params.year.id);

        //let models = [];
        await Promise.map(partzillaModels, async(partzillaModel) => {

            let partshouseModel = partshouseModels.find((partshouseModel) => {
                let parthouseName = prepareModelName(partshouseModel.name);
                let partzillaName = prepareModelName(partzillaModel.name);

                //check if partshouse name contains partzilla name
                return intersect(parthouseName, partzillaName).length;
            });

            if (typeof partshouseModel !== 'undefined') {

                debug('add ' + getPartshouseUrl([params.make.name]) + partshouseModel.url + ' to query');
                log.step(1);
                q.push({
                    step: 'components',
                    url: getPartshouseUrl([params.make.name]) + partshouseModel.url,
                    cookies: params.cookies,
                    make: params.make,
                    year: params.year,
                    model: partzillaModel
                });
            }
        });
    }


    async function processComponents(params) {

        let partshouseComponents = await getPartshouseComponents(params.url, params.cookies);
        let partzillaComponents = await categoryController.getChildrenList(params.model.id);

        await Promise.map(partzillaComponents, async(partzillaComponent) => {

            let partshouseComponent = partshouseComponents.find((partshouseComponent) => {
                return partshouseComponent.name == partzillaComponent.name;
            });

            if (typeof partshouseComponent !== 'undefined') {

                debug('add ' + getPartshouseUrl([params.make.name]) + partshouseComponent.url + ' to query');
                log.step(0, 1);
                q.push({
                    step: 'diagram',
                    url: getPartshouseUrl([params.make.name]) + partshouseComponent.url,
                    cookies: params.cookies,
                    make: params.make,
                    year: params.year,
                    model: params.model,
                    component: partzillaComponent
                });
            }
        });
    }


    async function processDiagram(params) {

        let component = params.component.dataValues;
        debug('parse diagram for '+ params.make.name + ' ' + params.model.name + ' ' + params.component.name);
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

        if(path.length == 0)
            return;

        //prepare url path section chain from names
        let preparedPath = path.map((pathSection) => {
            return pathSection
                .replace('-', '')
                .replace(/\s+/g, '')
                .toLowerCase();
        });

        if(path.length == 1)
            return 'https://www.'+preparedPath[0]+'partshouse.com';
        else
            return 'https://www.'+preparedPath[0]+'partshouse.com/oemparts/c/'+preparedPath.join('_')+'/parts';
    }


    async function getPartshouseModels(url, cookies) {

        return new Promise((resolve, reject) => {

            needle.get(url, {cookies: cookies}, async (err, res) => {
                if(err) return reject(err);

                return resolve(await parseModels(res.body));
            });
        });
    }

    async function getPartshouseComponents(url, cookies) {

        return new Promise((resolve, reject) => {

            needle.get(url, {cookies: cookies}, async (err, res) => {
                if(err) return reject(err);

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

            needle.get( url, { cookies: cookies }, (err, res) => {

                if(err)
                    return reject(err);

                let diagramUrl = res.body.match(/assempath\s=\s*'(\S*)'/)[1];

                if(diagramUrl == 'noimg/assembly.xml')
                    diagramUrl = null;

                return resolve(diagramUrl);
            });
        });
    }

    function prepareModelName(name) {
        return name.replace(' (', ' - ')
            .replace(')', '')
            .toLowerCase()
            .split(' - ');
    }
}


module.exports = {
    parse
};