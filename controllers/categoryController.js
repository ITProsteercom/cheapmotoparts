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

        let url = $(this).attr('href');

        categories[i] = {
            parent_id: parent_id,
            name: $(this).text(),
            //depth_level: getDepthLevel(url),
            url: url
        };
    });

    return categories;
}

function getDepthLevel(url) {

    return url.slice(1).split('/').length - 1;
}

async function getComponentsCount() {

    return await Category.count({
            where: {
                depth_level: 5
            }
        });
}

async function getComponents(limit = 0) {

    return await Category.findAll({
        where: { id: 3 },
        include: [{
            model: Category,
            as: 'ancestors'
        }],
        order: [ [ { model: Category, as: 'ancestors' }, 'depth_level' ] ]
    });
}

module.exports = {
    loadCategories,
    getComponentsCount,
    getComponents
};