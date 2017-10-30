//const env = process.env.NODE_ENV || 'development';
const config = require('config.json')('./config/config.json');
const db = require('./models');

const appController = require('./controllers/appController');

run()
    .catch(function(err) {
        console.error(err);
    });

async function run() {

    let url = config["partzilla"]["url"] + "/catalog";

    var cats = await appController.upsertCategories(url);

    db.sequelize.close();
}