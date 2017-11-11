var default_config = require(__dirname + '/../config/config.json')["default"];
const ProgressBar = require('process');

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
    console.log(str);
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

module.exports = {
    setAppConfig,
    createProgressBar
};