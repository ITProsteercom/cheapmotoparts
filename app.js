const ENV = require('dotenv').load().parsed;
const db = require('./models/database');
const debug = require('debug')('app');

const appController = require('./controllers/appController');

run().then(function() {
        debug('Done');
    })
    .catch(function(err) {
        debug('Errors: ', err);
    });

async function run() {

    debug(`Parser started`);
    try {
        await appController.load('/catalog/yamaha/motorcycle/2017/xvs95chs/seat');
    }
    catch (e) {
        debug(e);
    }
    debug('.....loading done');

    db.sequelize.close();
}