const Promise = require('bluebird');
const request = require('request');
const categoryController = require('./categoryController');
const Category = require('../models').Category;

const config = require('config.json')('./config/config.json');


async function upsertCategories(url = '/catalog', parent_id = null) {

    url = config["partzilla"]["url"] + url;

    await Promise.map(
        parseCategories(url),
        async function(category) {

            if(!category) {

                //TODO: parse Product Url Map here
                console.log("ERRROR");
                throw new Error("parse Product Url Map here");
            }

            category.parent_id = parent_id;

            return await Category.upsert(category).then(async function() {

                let dbCategory = await Category.findOne({where: { name: category.name }});

                await upsertCategories(dbCategory.url, dbCategory.id);
            });
        },
        {concurrency: 10}
    );
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