var fs = require('fs');
var twitterAPI = require('../js/twitterAPI.js');
var should = require('should');

/*const TEST_BASE_STRING = 'include_entities=true&oauth_consumer_key=xvz1evFS4wEEPTGEFPHBog&oauth_nonce=kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg&oauth_signature_method=HMAC-SHA1&oauth_timestamp=1318622958&oauth_token=370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb&oauth_version=1.0&status=Hello%20Ladies%20%2B%20Gentlemen%2C%20a%20signed%20OAuth%20request%21';*/

const TEST_BASE_STRING = 'POST&https%3A%2F%2Fapi.twitter.com%2F1%2Fstatuses%2Fupdate.json&include_entities%3Dtrue%26oauth_consumer_key%3Dxvz1evFS4wEEPTGEFPHBog%26oauth_nonce%3DkYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1318622958%26oauth_token%3D370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb%26oauth_version%3D1.0%26status%3DHello%2520Ladies%2520%252B%2520Gentlemen%252C%2520a%2520signed%2520OAuth%2520request%2521';

const TEST_SIGNING_KEY = 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw&LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE';

const TEST_SIGNATURE = 'tnnArxj06cWHq44gCs1OSKk/jLY=';

describe("test Twitter API", function() {
    
     var params = {
        status : 'Hello Ladies + Gentlemen, a signed OAuth request!',
        include_entities : true,
        oauth_consumer_key : 'xvz1evFS4wEEPTGEFPHBog',
        oauth_nonce	: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg',
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp	: 1318622958,
        oauth_token	: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
        oauth_version : '1.0'
    };
    
    var httpMethod='post';
    var url = 'https://api.twitter.com/1/statuses/update.json'; 
    var consumerSecret='kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw';
    var tokenSecret = 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE';
    
    it("STEP 1 - signature base string encoding", function() {
        twitterAPI.createSignatureBaseString(params, httpMethod, url).should.equal(TEST_BASE_STRING); 
    });

    it("STEP 2 - signing key", function() {
        twitterAPI.createSigningKey(consumerSecret, tokenSecret).should.equal(TEST_SIGNING_KEY);
    });
    
    it('STEP 3 - create signature', function() {
        twitterAPI.createSignature(TEST_BASE_STRING, TEST_SIGNING_KEY).should.equal(TEST_SIGNATURE);
    });
    
    it('Global Signature TEST ', function() {
        twitterAPI.getSignature(params, httpMethod, url, tokenSecret, consumerSecret).should.equal(TEST_SIGNATURE);
    });
    
    it('body response to token object', function() {
        var tokens = twitterAPI.bodyToTokens("param1=value1&param2=value2");
        tokens.param1.should.equal('value1');
        tokens.param2.should.equal('value2');
    });
    
    if('check oauth url', function() {
        twitterAPI.getOAuthURL().should.equal('https://api.twitter.com/oauth/authorize');
    });
    
});