var defaultConfigList = require(__dirname + '/../config/config.js').default;

var AppConfig = function() {
    var appConfig = {};
    const available = ['steps', 'parse', 'sync', 'make', 'cat', 'year', 'model', 'component'];


    var set = function(yargs) {
        Object.keys(yargs).forEach((key) => {
            if(available.includes(key)) {
                appConfig[key] = setConfig(key, yargs[key]);
            }
        });
    };


    var setConfig = function(configName, configValue) {

        if(typeof configValue === 'undefined' || configValue.length == 0)
            return null;

        if(configValue == 'default') {
            if (typeof defaultConfigList[configName] === 'undefined')
                return null;

            return defaultConfigList[configName];
        }

        if(String(configValue).split(',').length)
            return String(configValue).split(',');

        return formatTitleCase(configValue);
    };


    var formatTitleCase = function(str) {

        return str
            .toString()
            .toLowerCase()
            .split(',')
            .map(function(word) {
                return word[0].toUpperCase() + word.substr(1);
            });
    };


    var get = function (key = '') {

        if(key.length) {
            if(typeof appConfig[key] === 'undefined')
                return null;

            return appConfig[key];
        }

        return appConfig;
    };


    return {
        set: set,
        get: get
    }
}

module.exports = AppConfig();