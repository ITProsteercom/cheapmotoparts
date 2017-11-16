var default_config = require(__dirname + '/../config/config.json')["default"];
const ProgressBar = require('progress');
const Promise = require('bluebird');
const fs = require('fs');

function setAppConfig(arConfig, argv) {
    let appConfig = {};

    arConfig.forEach(function(config) {
        appConfig[config] = setConfig(argv[config], default_config[config]);
    });

    return appConfig;
}

function setConfig(consoleList, defaultList) {

    if(consoleList == 'default')
        return defaultList;

    if(typeof consoleList === 'undefined' || consoleList.length == 0)
        return null;

    return formatTitleCase(consoleList);
}

function formatTitleCase(str) {

    return str
        .toString()
        .toLowerCase()
        .split(',')
        .map(function(word) {
            return word[0].toUpperCase() + word.substr(1);
        });
}

function createProgressBar(string, total) {

    return new ProgressBar(
        `${string.padEnd(25)} [:bar] (:current/:total, :percent) Time: :elapseds/:etas`,
        {
            total: total,
            complete: '=',
            incomplete: ' ',
            width: 40,
        }
    );
}

function fileExists(path) {
    return new Promise((resolve, reject) => {
        fs.access(path, (err) => {
            if (err) {
                return err.code === 'ENOENT' ? resolve(false) : reject(err);
            }
            resolve(true);
        });
    });
}

/**
 * Randomize int from min to max including min and max
 * @param min
 * @param max
 * @returns {*}
 */
function getRandomInRange(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function intersect(left, right) {
    let intersect = [];

    //compare left with right
    let leftIntersect = left.filter((el) => right.indexOf(el) != -1);
    //compare right with left
    let rightIntersect = right.filter((el) => left.indexOf(el) != -1);

    return intersect.concat(leftIntersect).concat(rightIntersect);
}

module.exports = {
    setAppConfig,
    createProgressBar,
    fileExists,
    getRandomInRange,
    intersect
};