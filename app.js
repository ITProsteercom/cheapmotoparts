const ENV = require('dotenv').load().parsed;
const db = require('./models/database');
const debug = require('debug')('app');
const log = require('cllc')();

const appController = require('./controllers/appController');

run().then(function() {
        log.i('Complete');
    })
    .catch(function(err) {
        log.e('Errors: ', err);
    });

async function run() {

    log.i('Parser started');
    try {
        await appController.load('/catalog/yamaha/motorcycle/2017/xvs95chs');
    }
    catch (e) {
        debug(e);
    }

    db.sequelize.close();
}