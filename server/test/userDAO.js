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
    
    function deleteTestData(done) {
        // empty collection after tests
        var MongoClient = require('mongodb').MongoClient;      
        MongoClient.connect(process.env.MONGOLAB_URI, function(err, db) {
            db.collection("users").remove({login:'test'}, function() {
                db.close();
                done();
            });
        });
    }
    
    before(function(done) {
        this.timeout(10000);
        deleteTestData(done);
    });
    
    after(function(done) {
        this.timeout(10000);
        deleteTestData(done);
    });
    
    it("create new User", function(done) {
        this.timeout(10000);
        var user = {
            login: 'test'
        };
        userDAO.saveUser(user).then(function(result) {
            should.exist(result._id);
            done();
        });
    });
    
    it("retrieve User", function(done) {
        this.timeout(10000);
        userDAO.retrieveUserByLogin('test').then(function(result) {
            ('test').should.equal(result.login);
            done();
        });
    });
    
    it("update User", function(done) {
        this.timeout(15000);
        var user = {
            login: 'test',
            newParam : 'newValue'
        };
        userDAO.retrieveUserByLogin('test').then(function(result) {
           
            ('test').should.equal(result.login);
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