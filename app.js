//const env = process.env.NODE_ENV || 'development';
const config = require('config.json')('./config/config.json');
const db = require('./models');

const appController = require('./controllers/appController');

run().then(function() {
        console.log('............done!');
    })
    .catch(function(err) {
        console.error(err);
    });

async function run() {

    await appController.upsertCategories();

    db.sequelize.close();
}