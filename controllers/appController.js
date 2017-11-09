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
                        log.e((err || res.statusCode) + ' - ' + url);
                        return callback(true); // return url at the beginning of th e turn
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
                        //add products to categories associations
                        await productToCategoryController.saveProductsToCategory(products, item.id);

                        log.step(0, products.length);
                        callback();
                    }
                });

        }, 10); // run 10 parallel streams

        q.drain = function() {
            log.finish();
            log.i('Loading of categories and product is finished!');
            resolve(false);
        }

        q.retry = function(){
            q.pause();
            // в this лежит возвращённая в очередь задача.
            log.i('Paused on:', this);
            setTimeout(function(){
                q.resume();
                log.i('Resumed');
            }, 300000); // 5 минут
        }

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