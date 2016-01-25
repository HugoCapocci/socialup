var fs = require('fs');
var googleAPI = require('../../js/api/googleAPI.js');
var should = require('should');

if(process.env.GOOGLE_API_KEY===undefined)
    try {
        require('../../localeConfig.js');
    } catch (error) {
        console.log("No configuration file found");
    }

describe("test Google API", function() {
    
    it("check auth url", function() {

        var authURL = googleAPI.getOAuthURL();
        authURL.should.containEql('https://accounts.google.com/o/oauth2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth');
    });

    it("wrong token should be rejetcted", function(done) {
        googleAPI.pushCode('4/bzJ4zkPNwJXShSLmB1IRhHRFyXcqFiNUEANXOZVtSEU').then(null, function(err) {
            done();
        });
    });

});