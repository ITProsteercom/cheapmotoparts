'use strict';

var fs        = require('fs');
var path      = require('path');
var Sequelize = require('sequelize');
var basename  = path.basename(__filename);

const Op = Sequelize.Op;
const operatorsAliases = {
    $eq: Op.eq,
    $ne: Op.ne,
    $in: Op.in,
    $between: Op.between,
    $all: Op.all
};

var db = {};
var config = {};

config.parser = require(__dirname + '/../config/config.js').parser;
config.opencart = require(__dirname + '/../config/config.js').opencart;

Object.keys(config).forEach(configName => {

    let conf = config[configName];

    conf.operatorsAliases = operatorsAliases;
    conf.logging = false;

    var sequelize = new Sequelize(conf.database, conf.username, conf.password, conf);
    db[configName] = {};

    fs
        .readdirSync(__dirname+'/'+configName)
        .filter(file => {
            return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
        })
        .forEach(file => {
            var model = sequelize['import'](path.join(__dirname, configName, file));
            db[configName][model.name] = model;
        });

    Object.keys(db[configName]).forEach(modelName => {
        if (db[configName][modelName].associate) {
            db[configName][modelName].associate(db);
        }
    });

    db[configName].sequelize = sequelize;
    db[configName].Sequelize = Sequelize;
});

module.exports = db;