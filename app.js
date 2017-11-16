const ENV = require('dotenv').load().parsed;
const db = require('./models/database').parser;
const utils = require('./controllers/utils');
const debug = require('debug')('app');
const log = require('cllc')();
const argv = require('yargs').argv;

const parseController = require('./controllers/parseController');

global.appConfig = utils.setAppConfig(['make', 'cat', 'year', 'model'], argv);

run().then(function() {
        log.i('Complete');
    })
    .catch(function(err) {
        log.e('Errors: ', err);
    });

async function run() {

    log.i('Parser started');
    try {
        await parseController.load('/catalog');
    }
    catch (e) {
        log.w(e);
    }

    db.sequelize.close();
}