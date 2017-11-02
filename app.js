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

    await appController.loadDataFromPartzilla();

    db.sequelize.close();
}