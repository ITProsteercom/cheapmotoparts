const ENV = require('dotenv').load().parsed;
const db = require('./models/database').parser;
const debug = require('debug')('app');
const log = require('cllc')();
const argv = require('yargs').argv;

const parseController = require('./controllers/parseController');
const parsePartshouse = require('./controllers/parsePartshouse');
const importController = require('./controllers/importController');

var appConfig = require('./controllers/configController');

run().then(function() {
        log.i('Complete');
    })
    .catch(function(err) {
        log.e('Errors: ', err);
    });

async function run() {

    //set app configs
    appConfig.set(argv);

    try {
        if (appConfig.get('steps').includes('parse')) {
            await parseController.load('/catalog');
        }

        if(appConfig.get('steps').includes('diagram')) {
            await parsePartshouse.parse();
        }

        if(appConfig.get('steps').includes('import')) {
            await importController.run();
        }
    }
    catch (e) {
        log.w(e);
    }

    db.sequelize.close();
}