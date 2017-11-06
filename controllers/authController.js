const needle = require('needle');
const debug = require('debug')('authController');

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

module.exports = {
    authPartzilla
};