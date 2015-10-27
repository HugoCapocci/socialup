var fs = require('fs');
var googleAPI = require('../js/googleAPI.js');
var should = require('should');

describe("test Google API", function() {
    
    it("check auth url", function(/*done*/) {

        var authURL = googleAPI.auth();
        authURL.should.containEql('https://accounts.google.com/o/oauth2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth');
    });

    it("wrong token should be rejetcted", function(done) {
        
        googleAPI.pushCode('4/bzJ4zkPNwJXShSLmB1IRhHRFyXcqFiNUEANXOZVtSEU').then(function() {
            done('token should not be retrieved')
        }, function(err) {
            done();
        });
 
    });

});