const request = require('request');
const debug = require('debug')('utils');

async function getRequest(url) {

    debug('get request from ' + url);

    return new Promise(async function(resolve, reject) {

        await request.get(url, function(err, res, body){

            if(err) {
                debug('request fails from ' + url);
                reject(err);
            }

            debug('request successful from ' + url);
            resolve(body);
        });
    });
};


module.exports = {
    getRequest
};