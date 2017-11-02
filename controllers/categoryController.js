const config = require('config.json')('./config/config.json');
const cheerio = require('cheerio');
const Category = require('../models/database').Category;
const debug = require('debug')('categoryController');
const Promise = require('bluebird');
const tress = require('tress');
const needle = require('needle');

async function loadCategories(url = '/catalog') {

    debug('loading categories strating from '+ url);

    return new Promise(function (resolve, reject) {

        url = config["partzilla"]["url"] + url;

        var result = {}; //global result

        //reqursive scraping with tress
        var q = tress(function(url, callback) {

            let parent_id = null;

            //get parent id of inner categories from global result
            if (typeof result[url] !== 'undefined') {
                parent_id = result[url].id;
            }

            //process requested url
            needle.get(url, async function(err, res) {
                if (err) throw err;

                //parse categories from body
                let categoriesPartzilla = await parseCategoties(res.body, parent_id);

                if(categoriesPartzilla.length > 0) {

                    //save categories to db
                    let categories = await Category.upsertBulkAndReturn(categoriesPartzilla, parent_id);

                    categories.forEach(function (category) {

                        //add new Category to result
                        result[config["partzilla"]["url"] + category.url] = category.dataValues;

                        //add next url to query
                        q.push(config["partzilla"]["url"] + category.url);
                    });

                    debug(categories.length + ' categories were added/updated');
                }
                else {

                    //TODO: Parse products here
                    reject("Parse products here");
                }



                callback(); //cal callback in the end
            });
        }, 10); // run 10 parallel streams

        q.drain = function(){
            debug('tressCategories done');
        }

        //add initial url to query
        q.push(url);
    });
}


async function parseCategoties(html_page, parent_id) {

    var $ = await cheerio.load(html_page);
    var categories = [];

    $('.catalog-table').find('table').last().find('a').each(function(i, elem) {

        categories[i] = {
            name: $(this).text(),
            url: $(this).attr('href'),
            parent_id: parent_id
        };

    });

    return categories;
}

module.exports = {
    loadCategories
};