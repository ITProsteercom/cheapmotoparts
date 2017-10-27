var should = require('should');

const db = require('../database/connect');

describe('Testing database', function() {

    describe('test connection to database', function() {

        // before(function(){
        //     var config = require('config.json')('./config.json');
        //     db.connect(config);
        // });

        it('should connect to database', function (done) {

            db.authenticate(require('config.json')('./config.json'), function(err, res) {

                res.should.eql('Connection has been established successfully.');
                done();
            });

        })
    });
});

