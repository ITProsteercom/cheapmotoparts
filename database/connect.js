const Sequelize = require('sequelize');


var connect = function (config) {

    return new Sequelize(
        config.db.name,
        config.db.username,
        config.db.password,
        {
            host: config.db.host,
            dialect: config.db.dialect,
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