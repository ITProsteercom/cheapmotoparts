const config = require('config.json')('./config/config.json');
const debug = require('debug')('сontroller:app');
const log = require('cllc')();
const needle = require('needle');
const tress = require('tress');

const authController = require('./authController');
const categoryController = require('./categoryController');
const productController = require('./productController');
const productToCategoryController = require('./productToCategoryController');

//depth level - category name
var categoryChain = {
    1: 'make',
    2: 'category',
    3: 'year',
    4: 'model',
    5: 'component'
};

async function load(url = '/catalog') {

    var cookiePartzilla = await authController.authPartzilla(config['partzilla']);

    return new Promise(async function(resolve, reject) {

        log.start('Найдено категорий %s, Найдено товаров %s.');
        //reqursive scraping with tress
        var q = tress(async function(item, callback) {

            //process requested url
            await needle.get(
                config["partzilla"]["url"] + item.url,
                {cookies: cookiePartzilla},
                async function(err, res) {
                    if (err || res.statusCode !== 200) {
                        debug((err || res.statusCode) + ' - ' + item.url);
                        throw err;
                    }

                    //parse and save categories
                    let categories = await categoryController.loadCategories(res.body, item.id);

                    if(categories.length > 0) {

                        q.push(categories);//add next categories to query
                        log.step(categories.length);
                        callback(); //call callback in the end
                    }
                    else {
                        //parse and save products
                        let products = await productController.loadProducts(res.body);
                        await productToCategoryController.saveProductsToCategory(products, item.id);
                        log.step(0, products.length);
                        callback();
                    }
                });

        }, 10); // run 10 parallel streams

        // q.success = function() {
        //     debug('Job successfully finished.');
        //     //resolve(false);
        // }

        q.drain = function() {
            log.finish();
            log.i('Loading of categories and product is finished!');
            resolve(false);
        }

        // q.error = function(err) {
        //     reject(err);
        // };

        //add initial url to query
        q.push({
            url: url,
            id: null
        });
    });
}


module.exports = {
    load
};