var fs = require('fs');
var googleAPI = require('../js/googleAPI.js');
var should = require('should');

describe("test Google API", function() {
    
    it("shorten URL function should exist", function(/*done*/) {
        should.exist(googleAPI.getShortUrl);    
        var authURL = googleAPI.auth();
        authURL.should.containEql('https://accounts.google.com/o/oauth2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth');
    });
    
});