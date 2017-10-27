var request = require('request');

var getRequest = function(url, callback) {

	request.get(url, function(err, res, body){

		callback(err, res, body);
	});
};

module.exports = {
	getRequest: getRequest
};