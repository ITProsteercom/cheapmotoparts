var should = require('should');
var env = process.env.NODE_ENV || 'development';
var config = require('config.json')('./config/config.json')[env];

const db = require('../database/connect');

describe('Testing database', function() {

    describe('test connection to database', function() {

        it('should connect to database', function (done) {

            db.authenticate(config, function(err, res) {

                res.should.eql('Connection has been established successfully.', res);
                done();
            });

        })
    });
});

