var default_config = require(__dirname + '/../config/config.js').default;
const ProgressBar = require('progress');
const Promise = require('bluebird');
const fs = require('fs');

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


module.exports = {
    createProgressBar,
    fileExists,
    getRandomInRange
};