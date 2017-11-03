const config = require('config.json')('./config/config.json');
const debug = require('debug')('appController');
const needle = require('needle');
const tress = require('tress');

const categoryController = require('./categoryController');
const productController = require('./productController');

async function load(url = '/catalog') {

    return new Promise(async function(resolve, reject) {

        debug('load start');
        //reqursive scraping with tress
        var q = tress(function(item, callback) {

            //process requested url
            needle.get(config["partzilla"]["url"] + item.url, async function(err, res) {
                if (err || res.statusCode !== 200) {
                    debug((err || res.statusCode) + ' - ' + item.url);
                    throw err;
                }

                //parse categories from body
                let categories = await categoryController.loadCategories(res.body, item.id);

                if(categories.length > 0) {
                    //add next categories to query
                    q.push(categories);
                    debug(categories.length + ' categories were added/updated');
                }
                else {
                    //Parse products here
                    debug('parse products here');
                    let products = await productController.loadProducts(res.body, item.id);
                    debug(products.length + ' products were added/updated');
                }
            });

            callback(); //call callback in the end

        }, 10); // run 10 parallel streams

        // q.success = function() {
        //     debug('Job successfully finished.');
        //     resolve(false);
        // }

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