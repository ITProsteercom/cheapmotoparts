const Promise = require('bluebird');
const request = require('request');
const categoryController = require('./categoryController');
const Category = require('../models').Category;


async function upsertCategories(url) {

    await Promise.map(parseCategories(url), function(category) {
        return Category.upsert(category);
    });

    return Category.findAll();
}


async function parseCategories(url) {

    let html = await getRequest(url);

    return await categoryController.getCategoties(html);
}


function getRequest(url) {

    return new Promise(function(resolve, reject) {

        request.get(url, function(err, res, body){

            if(err) {
                reject(err);
            }

            resolve(body);
        });
    });
};

module.exports = {
    getRequest,
    parseCategories,
    upsertCategories
};