var env       = process.env.NODE_ENV || 'development';
var config = require('config.json')('./config/config.json')[env];
console.log(config);