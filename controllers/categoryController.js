const cheerio = require('cheerio');
const debug = require('debug')('controller:category');

const Category = require('../models/database').parser.Category;

//depth level - category name
const categoryChain = {
    1: 'make',
    2: 'cat',
    3: 'year',
    4: 'model',
    5: 'component'
};


async function loadCategories(html, parent_id) {

    //parse categories
    let categoriesPartzilla = await parseCategoties(html, parent_id);

    //filter categories
    let filteredCategories = filterCategories(categoriesPartzilla);

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


function filterCategories(categoryList) {

    if(categoryList.length == 0)
        return [];

    let category_type = categoryChain[getDepthLevel(categoryList[0].url)];
    let filterUrl = global.appConfig[category_type];

    if(typeof filterUrl === 'undefined' || filterUrl == null)
        return categoryList;

    return categoryList.filter(function (category) {

        if(category_type == 'year')
            return +category.name >= filterUrl;

        return filterUrl.includes(category.name);
    });
}


async function parseCategoties(html_page, parent_id) {

    var $ = await cheerio.load(html_page);
    var categories = [];

    $('.catalog-table').find('table').last().find('a').each(function(i) {

        let name = $(this).text();
        let url = $(this).attr('href');
        let depth_level = getDepthLevel(url);

        //if it is Model category slice name to ' - '
        // if(depth_level == 4)
        //     name = name.replace(/\s-\s.*/, '');

        categories[i] = {
            parent_id: parent_id,
            name: name,
            depth_level: getDepthLevel(url),
            url: url
        };
    });

    return categories;
}

function getDepthLevel(url) {

    return url.slice(1).split('/').length - 1;
}


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


async function count(filter = {}) {

    return await Category.count({
        where: filter
    });
}

module.exports = {
    loadCategories,
    updateCategories,
    upsertAndReturnCategories,
    getMakeList,
    getChildrenList,
    count
};