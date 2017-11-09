var default_config = require(__dirname + '/../config/config.json')["default"];

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
        .toLowerCase()
        .split(',')
        .map(function(word) {
            return word[0].toUpperCase() + word.substr(1);
        });
}

module.exports = {
    setAppConfig
};