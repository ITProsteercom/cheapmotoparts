const ENV = require('dotenv').load().parsed;
const db = require('./models/database').parser;
const utils = require('./controllers/utils');
const debug = require('debug')('app');
const log = require('cllc')();
const argv = require('yargs').argv;

const parseController = require('./controllers/parseController');
const diagramController = require('./controllers/diagramController');
const importController = require('./controllers/importController');

global.appConfig = utils.setAppConfig(['make', 'cat', 'year', 'model'], argv);

const parser_steps = argv.steps ? argv.steps.toLowerCase().split(',') : ['parse', 'diagram', 'import'];
const import_steps = argv.sync ? argv.sync.toLowerCase().split(',') : ['category', 'make', 'diagram', 'product'];

run().then(function() {
        log.i('Complete');
    })
    .catch(function(err) {
        log.e('Errors: ', err);
    });

async function run() {

    try {
        if (parser_steps.includes('parse')) {
            await parseController.load('/catalog');
        }
        else if(parser_steps.includes('diagram')) {
            await diagramController.parse();
        }
        else if(parser_steps.includes('import')) {
            await importController.run(import_steps);
        }
    }
    catch (e) {
        log.w(e);
    }

    db.sequelize.close();
}