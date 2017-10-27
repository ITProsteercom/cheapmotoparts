const Sequelize = require('sequelize');


var connect = function (config) {

    return new Sequelize(
        config.database,
        config.username,
        config.password,
        {
            host: config.host,
            dialect: config.dialect,
            operatorsAliases: false
        }
    );
};

var authenticate = function(config, callback) {

    var sequelize = connect(config);

    sequelize
        .authenticate()
        .then(function() {
            callback(null, 'Connection has been established successfully.');
        })
        .catch(function(err) {
            callback(err, 'Unable to connect to the database');
        });
};

module.exports = {
    connect: connect,
    authenticate: authenticate
}