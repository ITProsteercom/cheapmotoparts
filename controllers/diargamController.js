const { createProgressBar } = require('./utils');

const db = require('../models/database');
var Promise = require("bluebird");
const authController = require('./authController');
const categoryController = require('./categoryController');

// authController.getCookiesPartshouse('Honda').then(function(res) {
//     console.log(res);
// });

const limit = 10;

async function parseDiagrams() {

    let componentsTotal = await categoryController.getComponentsCount();
    let componentsHandled = 0;

    console.log(componentsTotal);

    let cats = await categoryController.getComponents();

    Promise.map(cats, function(cat, index) {
        console.log(index);
        console.log(JSON.stringify(cat));
    });
/*
    const progress = createProgressBar('loading diagrams', componentsTotal);

    while(componentsHandled < componentsTotal) {
        //get components without diagram
    }
*/

    db.sequelize.close();
}

parseDiagrams();
