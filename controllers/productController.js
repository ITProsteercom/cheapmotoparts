const cheerio = require('cheerio');
const debug = require('debug')('controller:product');

const Product = require('../models/database').parser.Product;

async function loadProducts(html) {

    let productsPartzilla = await parseComponentProducts(html);

    let productsDB = await saveComponentProducts(productsPartzilla);

    return productsPartzilla.map(function (product) {

        let productDB = productsDB.find(function(productDB) {
            return product.sku == productDB.sku;
        });

        product.id = productDB.id;

        return product;
    });
}


async function saveComponentProducts(products) {

    if(products.length <= 0)
        return [];

    return await Product.upsertBulkAndReturn(products);
}


async function parseComponentProducts(html) {

    let $ = await cheerio.load(html);
    let products = [];

    $('.prductTable').find('table tbody tr').each((i, item) => {

        let name = $(item).find('td').eq(1).find('a').eq(0).text();
        let url = $(item).find('td').eq(1).find('a').eq(0).attr('href');
        let diagram = $(item).find('td').eq(0).text();
        let qty = $(item).find('td.tabQty').find('input[name="qty"]').val();

        let prices = $(item).find('td').eq(2).html().split('<br>');
        let price = +prices[prices.length-1].replace(/[$Unavailable]/g, '');//get last price

        let data = {
            name: name.replace(/\s{2,}\sNot Available/g, ' ').trim(), //cut string Not Available and spaces
            url: url,
            sku: $(item).find('td').eq(1).find('a').eq(1).text(),
            price: price,
            diagram_number: diagram ? diagram.replace(/(?:\t|\n|\r|\f)/g, '') : null,
            required_quantity: (typeof qty != 'undefined') ? +qty.replace(/\D/g, '') : null
        };

        products.push(data);
    });

    return products;
}

module.exports = {
    loadProducts
};