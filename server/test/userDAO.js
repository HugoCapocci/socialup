var fs = require('fs');
var should = require('should');

if(process.env.MONGOLAB_URI===undefined)
    try {
        require('../../localeConfig.js');
    } catch (error) {
        console.warn("No configuration file found");
    }
var userDAO = require('../js/userDAO.js');

describe("userDAO tests", function() {
    
    after(function(done) {

        this.timeout(10000);
        // empty collection after tests
        var MongoClient = require('mongodb').MongoClient;      
        MongoClient.connect(process.env.MONGOLAB_URI, function(err, db) {
            db.collection("users").remove({id:'test'}, function() {
                db.close();
                done();
            });
        });
    });
    
    it("create new User", function(done) {
        this.timeout(10000);
        var user = {
            id: 'test'
        };
        userDAO.saveUser(user).then(function(result) {
            should.exist(result._id);
            done();
        });
    });
    
    it("retrieve User", function(done) {
        this.timeout(10000);
        userDAO.retrieveUser('test').then(function(result) {
            ('test').should.equal(result.id);
            done();
        });
    });
    
    it("update User", function(done) {
        this.timeout(15000);
        var user = {
            id: 'test',
            newParam : 'newValue'
        };
        userDAO.retrieveUser('test').then(function(result) {
           
            ('test').should.equal(result.id);
            should.exist(result._id);
            user._id = result._id;
            userDAO.saveUser(user).then(function(result2) {

                should.exist(result2._id);
                ('newValue').should.equal(result2.newParam);
                done();
            }, function(err) {
                console.log("error : ", err);
                done(err);
            });
        });
    });

});