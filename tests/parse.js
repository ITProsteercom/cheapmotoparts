var should = require('should');
var request = require('request');
var parse = require('../src/parser.js');
var parsePartzilla = require('../src/parse-partzilla.js');

describe('Parse', function() {

	describe('Parse partzilla.com', function() {

		it('should return ok status from parzilla catalog', function(done) {

			var url = "https://partzilla.com/catalog";

			parse.getRequest(url, function(err, res, body){

				res.statusCode.should.equal(200);
				body.should.match(/Select Make/);
				done();
			});
				
		});


		it('should contains a table of manufacturers on catalog page', function() {

			var url = "https://partzilla.com/catalog";

			parse.getRequest(url, function(err, res, body){
				
				parsePartzilla.getManufacturers(body).should.be.not.empty();
				done();
			});
			
		});

	});
});