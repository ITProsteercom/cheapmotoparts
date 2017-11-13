const needle = require('needle');
const debug = require('debug')('controller:auth');

async function authPartzilla(credentials) {

    let authUrl = credentials.url + '/account/login';

    return new Promise((resolve, reject) => {

        // get cookies from partzilla
        needle.get(authUrl, function(err, response){
            if (err || response.statusCode != 200)
                reject(err || response.statusCode);

            // authentification with credentials and cookies
            needle.post(
                authUrl, {
                    form_login: '',
                    email: credentials.login,
                    pwd: credentials.password
                }, {
                    'cookies': response.cookies
                },
                () => resolve(response.cookies)
            );
        });
    });
}

async function getCookiesPartshouse(manufacturerName) {

    let preparedName = manufacturerName
                        .replace('-', '')
                        .replace(/\s+/g, '')
                        .toLowerCase();

    let url = 'https://www.' + preparedName + 'partshouse.com';

    return new Promise((resolve, reject) => {

        // get cookies from {name}partshouse.com
        needle.get(url, function(err, response) {
            if (err)
                return reject(err);

            return resolve(response.cookies);
        });
    });
}

module.exports = {
    authPartzilla,
    getCookiesPartshouse
};