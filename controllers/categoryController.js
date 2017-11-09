const cheerio = require('cheerio');
const debug = require('debug')('controller:category');

const Category = require('../models/database').Category;

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
    return await upsertCategories(filteredCategories, parent_id);
}


async function upsertCategories(categories, parent_id) {

    if(categories.length <= 0)
        return [];

    return await Category.upsertBulkAndReturn(categories, parent_id);
}


function filterCategories(categoryList) {

    if(categoryList.length == 0)
        return [];

    let depth_level = categoryList[0].url.slice(1).split('/').length - 1;
    let category_type = categoryChain[depth_level];
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