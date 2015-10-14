var fs = require('fs');
var googleAPI = require('../js/googleAPI.js');
var should = require('should');

describe("test Google API", function() {
    
    it("shorten URL function should exist", function(/*done*/) {
        should.exist(googleAPI.getShortUrl);
  /*      googleAPI.getShortUrl().then(
            function(msg) {
                done();
            }, function(err) {
                done(err);
            }
        );*/
        
        var authURL = googleAPI.auth();
        authURL.should.equal('https://accounts.google.com/o/oauth2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.upload&response_type=code&client_id=460439937906-82cfg0afrcijo1imh4la3hcb78h692ga.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fgoogle2callback');
    });
    
});