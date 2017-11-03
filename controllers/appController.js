const categoryController = require('./categoryController');
const debug = require('debug')('appController');


async function loadDataFromPartzilla() {

    debug('loadDataFromPartzilla start');

    try {
        await categoryController.loadCategories('/catalog');
    }
    catch(e) {
        debug(e);
    }

    debug('loadDataFromPartzilla done');



}

module.exports = {
    loadDataFromPartzilla
};