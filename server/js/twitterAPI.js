'use strict';

/*
* TWITTER WEB API
* see https://dev.twitter.com/rest/public
*/

var https = require('https');
var http = require('http');
var request = require('request');
var Q = require('q');
var fs = require('fs');
var querystring = require('querystring');
var oAuthNonce = require('./oauth_nonce.js');
var crypto = require('crypto');

//TODO externaliser dans variables denvironnement, git-ignored
const APP_KEY = process.env.TWITTER_APP_KEY; //PxmS6sGcO9ovTH7PqPTA
const APP_SECRET = process.env.TWITTER_APP_SECRET;
//const REDIRECT_URL = 'oob';
const REDIRECT_URL = process.env.APP_URL + '/twitter2callback?state=user';
const TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET;

function getOAuthURL() {
    return 'https://api.twitter.com/oauth/authorize';
}

// request a token by post
function getTokens() {
        
    var deferred = Q.defer();
    var headerParams = {
        'oauth_callback' : REDIRECT_URL,
        'oauth_consumer_key' : APP_KEY,
        'oauth_nonce' : oAuthNonce(),
        'oauth_signature_method' : 'HMAC-SHA1',
        'oauth_timestamp' : Math.round(new Date() / 1000),
        'oauth_token' : TOKEN,
        'oauth_version' : '1.0'
        
    };
    var url= 'https://api.twitter.com/oauth/request_token';
    headerParams.oauth_signature = getSignature(headerParams, 'post', url, TOKEN_SECRET);
        
    request({
        uri : url,
        headers : {
            'Authorization' : 'OAuth '+inLineParams(headerParams)
        },
        method: "POST"
    }, function(error, response, body) {
    
        //client error
        if(error)
            deferred.reject(new Error(error)); 
        else {
            console.log("getTokens statusCode? ", response.statusCode);
            console.log("body: ", body);
            deferred.resolve(bodyToTokens(body));
        }
    });
    return deferred.promise;
}

function inLineParams(params) {
    
    var keys = Object.keys(params);
    keys.sort();
    var line ='';
    keys.forEach(function(key) {
        line+=key+'="'+percentEncode(params[key])+'",';
    });
    return line.substring(0, line.length-1);
}

// see https://dev.twitter.com/oauth/overview/creating-signatures
function createSignatureBaseString(params, httpMethod, url) {
    
    var keys = Object.keys(params);
    keys.sort();
    var line ='';
    keys.forEach(function(key) {
        line+='&'+key+'='+percentEncode(params[key]);
    });
    return httpMethod.toUpperCase()+'&'+percentEncode(url)+'&'+percentEncode(line.substring(1));
}
function createSigningKey(consumerSecret, tokenSecret) {
    return percentEncode(consumerSecret)+'&'+percentEncode(tokenSecret);
}
function createSignature(baseString, signingKey) {
    var hmac = crypto.createHmac('sha1', signingKey);
    //hmac.setEncoding('base64');
    return hmac.update(baseString).digest('base64');
}

function getSignature(params, httpMethod, url, tokenSecret) {
    var baseString = createSignatureBaseString(params, httpMethod, url);
    
    console.log("SIGNATURE BASE STRING ", baseString);
    return createSignature(baseString, createSigningKey(APP_SECRET, tokenSecret));
}

// 'percent encode'
function percentEncode(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

//last step of the authentication validation
function getAccessToken(oauthVerifier, tokens) {

    var deferred = Q.defer();
    var headerParams = {
      /*  'oauth_callback' : encodeURIComponent(REDIRECT_URL),*/
        'oauth_consumer_key' : APP_KEY,
        'oauth_nonce' : oAuthNonce(),
        'oauth_signature_method' : 'HMAC-SHA1',
        'oauth_timestamp' : Math.round(new Date() / 1000),
        'oauth_token' : tokens.oauth_token,
        'oauth_version' : '1.0'
    };
    
    var url= 'https://api.twitter.com/oauth/access_token';
    var token_secret = tokens.oauth_token_secret;
    if(token_secret===undefined) {
        console.log("pas de oauth token secret, use default");
        token_secret= TOKEN_SECRET;
    }
    headerParams.oauth_signature = getSignature(headerParams, 'post', url, token_secret);

    request({
        uri : url,
        headers : {
            'Authorization' : 'OAuth '+inLineParams(headerParams)
        },
        method: "POST",
        form : {
            oauth_verifier : oauthVerifier
        }
    }, function(error, response, body){

        console.log("access token from verification code");
        //client error
        if(error)
            deferred.reject(new Error(error));
        else {
            console.log("statusCode? ", response.statusCode);
            deferred.resolve(bodyToTokens(body));
        }
    });
    return deferred.promise;
}

function tweet(tokens, message) {
    
    var deferred = Q.defer();
    var headerParams = {
        'oauth_consumer_key' : APP_KEY,
        'oauth_nonce' : oAuthNonce(),
        'oauth_signature_method' : 'HMAC-SHA1',
        'oauth_timestamp' : Math.round(new Date() / 1000),
        'oauth_token' : tokens.oauth_token,
        'oauth_version' : '1.0'
    };
    var globalParams=headerParams;
    globalParams.status=message;
    
    var url= 'https://api.twitter.com/1.1/statuses/update.json';
    headerParams.oauth_signature = getSignature(globalParams, 'post', url, tokens.oauth_token_secret);

    request({
        uri : url,
        headers : {
            'Authorization' : 'OAuth '+inLineParams(headerParams)
        },
        method: "POST",
        form : {
            status : message
        }
    }, function(error, response, body){
 
        //client error
        if(error)
            deferred.reject(new Error(error));
        else {
            console.log("tweet response statusCode: ", response.statusCode);
            deferred.resolve(response);
        }
    });
    return deferred.promise;
}

function getTweets(tokens) {
    
    var deferred = Q.defer();
    var headerParams = {
        'oauth_consumer_key' : APP_KEY,
        'oauth_nonce' : oAuthNonce(),
        'oauth_signature_method' : 'HMAC-SHA1',
        'oauth_timestamp' : Math.round(new Date() / 1000),
        'oauth_token' : tokens.oauth_token,
        'oauth_version' : '1.0'
    };
    
    var globalParams=headerParams;
    globalParams.user_id=tokens.user_id;
    
    var url= 'https://api.twitter.com/1.1/statuses/user_timeline.json';
    headerParams.oauth_signature = getSignature(globalParams, 'get', url, tokens.oauth_token_secret);

    request({
        uri : url+'?user_id='+tokens.user_id,
        headers : {
            'Authorization' : 'OAuth '+inLineParams(headerParams)
        },
        method: "GET"
    }, function(error, response, body){
 
        console.log(body);
        //client error
        if(error)
            deferred.reject(new Error(error));
        else {
            console.log("tweet response statusCode: ", response.statusCode);
            deferred.resolve(response);
        }
    });
    return deferred.promise;

}

function bodyToTokens(body) {
    
    var tokenArray = body.split('&');
    var tokens = {};
    for(var i=0; i<tokenArray.length; i++) {
        var elems = tokenArray[i].split('=');
        tokens[elems[0]]=elems[1];
    }
    return tokens;    
}

exports.getOAuthURL=getOAuthURL;
exports.getTokens=getTokens;
exports.createSignatureBaseString=createSignatureBaseString;
exports.createSigningKey=createSigningKey;
exports.createSignature=createSignature;
exports.getAccessToken=getAccessToken;
exports.tweet=tweet;
exports.getTweets=getTweets;