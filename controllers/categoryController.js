const cheerio = require('cheerio');
const debug = require('debug')('categoryController');

const Category = require('../models/database').Category;


async function loadCategories(html, parent_id) {

    //parse categories
    let categoriesPartzilla = await parseCategoties(html, parent_id);

    //save categories to db
    return await upsertCategories(categoriesPartzilla, parent_id);
}


async function upsertCategories(categories, parent_id) {

    if(categories.length <= 0)
        return [];

    return await Category.upsertBulkAndReturn(categories, parent_id);
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
    parseCategoties,
    upsertCategories,
    loadCategories
};