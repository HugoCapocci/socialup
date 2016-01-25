var fs = require('fs');
var oAuthNonce = require('../../js/api/oauth_nonce.js');
var should = require('should');

describe("test OAuth_once generator", function() {
    
    it("test sync mode", function() {

        var token = oAuthNonce();
        should.exist(token);
        console.log('oauth nonce token: ',token);
    });

    it("test async mode", function(done) {
        
        var token = oAuthNonce(function(token) {    
            console.log('oauth nonce token: ',token);
            should.exist(token);
            done();
        });
 
    });

});