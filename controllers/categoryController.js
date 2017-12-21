const cheerio = require('cheerio');
const debug = require('debug')('controller:category');

var appConfig = require('./configController');
const Category = require('../models/database').parser.Category;

var categoryChain = require('./../repo/categoryChain');
var filterConstructor = require('./../repo/filterConstructor');

async function loadCategories(html, parent_id) {

    //parse categories
    let categoriesPartzilla = await parseCategoties(html, parent_id);

    //filter categories
    let depth_level = getDepthLevel(categoriesPartzilla[0].url);
    let filteredCategories = filterCategories(categoriesPartzilla, depth_level);

    //save categories to db
    return await upsertAndReturnCategories(filteredCategories, parent_id);
}

async function upsertAndReturnCategories(categories, parent_id) {

    if(categories.length <= 0)
        return [];

    return await Category.upsertBulkAndReturn(categories, parent_id);
}

async function updateCategories(categories) {

    if(categories.length <= 0)
        return [];

    return await Category.upsertBulk(categories);
}

function filterCategories(categoryList, depth_level = 1) {

    if(categoryList.length == 0)
        return [];

    let category_type = categoryChain.getType(depth_level);
    let filterUrl = appConfig.get(category_type);

    if(typeof filterUrl === 'undefined' || filterUrl == null)
        return categoryList;

    return categoryList.filter(function (category) {

        if(category_type == 'year') {
            return +category.name >= filterUrl[0] && +category.name <= filterUrl[1];
        }

        return filterUrl.includes(category.name);
    });
}

async function parseCategoties(html_page, parent_id) {

    var $ = await cheerio.load(html_page);
    var categories = [];

    $('.catalog-table').find('table').last().find('a').each(function(i) {

        let name = $(this).text();
        let url = $(this).attr('href');

        categories[i] = {
            parent_id: parent_id,
            name: name,
            depth_level: getDepthLevel(url),
            url: url
        };
    });

    return categories;
}

/**
 * get category depth level by its url from Partzilla
 * @param url
 * @returns {number}
 */
function getDepthLevel(url) {

    return url.slice(1).split('/').length - 1;
}


/**
 * get list of manufacturers
 *
 * @param filter
 * @returns {*|Promise.<Array.<Model>>}
 */
async function getMakeList(filter = {}) {

    filter.depth_level = 1;

    return await Category.findAll({ where: filter });
}

async function getChildrenList(parent_id, filter = {}) {

    filter.parent_id = parent_id;

    return await Category.findAll({
        where: filter
    });
}

async function findAll(filter = {}, limit = 0, offset = 0) {

    const options = {};

    if(!!filter)
        options.where = filter;

    if(limit > 0)
        options.limit = limit;

    if(offset > 0)
        options.offset = offset;

    return await Category.findAll(options);
}

async function count(options = {}) {

    return await Category.count(filterConstructor.make(options));
}

async function getList(options = {}, limit = 0, offset = 0) {

    options = filterConstructor.make(options);

    if(limit > 0)
        options['limit'] = limit;

    if(offset > 0)
        options['offset'] = offset;

    return await Category.findAll(options);
}

module.exports = {
    loadCategories,
    updateCategories,
    filterCategories,
    upsertAndReturnCategories,
    getMakeList,
    getChildrenList,
    count,
    findAll,
    getList
};