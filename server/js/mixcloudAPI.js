'use strict';

/*
* MIXCLOUD WEB API
  see https://www.mixcloud.com/developers/
*/

var https = require('https');
var http = require('http');
var request = require('request');
var Q = require('q');
var fs = require('fs');

const CLIENT_ID = process.env.MIXCLOUD_CLIENT_ID;
const CLIENT_SECRET = process.env.MIXCLOUD_CLIENT_SECRET;
const REDIRECT_URI = process.env.APP_URL + '/mixcloud2callback';

exports.getOAuthURL = function() {
    return 'https://www.mixcloud.com/oauth/authorize?client_id='+CLIENT_ID+'&redirect_uri='+REDIRECT_URI;
};

exports.pushCode = function(code, userId) {

    var deferred = Q.defer();
    var req_options = {
        host: 'www.mixcloud.com',
        port: 443,
        path: '/oauth/access_token?client_id='+CLIENT_ID+'&redirect_uri='+REDIRECT_URI+'?state='+userId+'&client_secret='+CLIENT_SECRET+'&code='+code,
        method: 'GET'
    };
    var req = https.request(req_options, function(res) {

        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            //console.log("mixcloud code validated ?  ",data);
            deferred.resolve(JSON.parse(data));
        });
    });
    req.on('error', function(e) {         
        console.log('mixcloud authentication error: ', e);
        deferred.reject(e);
    });    
    req.end();    
    return deferred.promise;
};

exports.getUserInfo = function(tokens) {

    var deferred = Q.defer();
    var req_options = {
        host: 'api.mixcloud.com',
        path: '/me/?access_token='+tokens.access_token,
        method: 'GET'
    };
    var req = https.request(req_options, function(res) {
        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            var results = JSON.parse(data);
            if(results.error) {
                console.log('mixcloud authentication error: ', results.error.message);
                deferred.reject(results.error);
            } else {
                //console.log("user info ?  ",results);                
                deferred.resolve({userName:results.username});
            }
        });
    });
    req.on('error', function(e) {         
        console.log('mixcloud authentication error: ', e);
        deferred.reject(e);
    });    
    req.end();    
    return deferred.promise;

};