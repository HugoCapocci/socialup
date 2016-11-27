'use strict';

/*
 LINKED IN WEB API
 see https://developer.linkedin.com/docs
*/
var https = require('https');
var http = require('http');
var request = require('request');
var Q = require('q');
var fs = require('fs');
var querystring = require('querystring');

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.APP_URL + '/linkedin2callback';

//see https://developer.linkedin.com/docs/oauth2
function getOAuthURL() {
    return 'https://www.linkedin.com/uas/oauth2/authorization?response_type=code&client_id='+CLIENT_ID+'&redirect_uri='+REDIRECT_URI;
}

function pushCode(code) {
  
    var deferred = Q.defer();

    //ask for token
    var post_data = querystring.stringify({
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri' : REDIRECT_URI,
        'grant_type' : 'authorization_code',
        'code' : code
    });
    
    var post_options = {
        host: 'www.linkedin.com',
        port: 443,
        path: '/uas/oauth2/accessToken',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': post_data.length
        }
    };

    var post_req = https.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            deferred.resolve(JSON.parse(chunk));
        });       
    });

    post_req.on('error', function(e) {
      deferred.reject(new Error(e));
    });

    // post the data
    post_req.write(post_data);
    post_req.end();
    
    return deferred.promise;
}

function getUserInfo(tokens) {

    var deferred = Q.defer();

    var req_options = {
        host: 'api.linkedin.com',
        port: 443,
        path: '/v1/people/~?format=json',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer '+tokens.access_token
        }
    };

    var req = https.request(req_options, function(res) {

        var data='';
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {            
            var userInfo = JSON.parse(data);
            deferred.resolve({userName:userInfo.firstName+' '+userInfo.lastName});
            //deferred.resolve(userInfo);
        });
    });
    
    req.on('error', function(e) {         
        console.log('get user infos error: ', e);
        deferred.reject(new Error(e));
    });
    
    req.end();
    return deferred.promise;
}

function postMessage(tokens, message) {

    var deferred = Q.defer();
    var post_data = {
        comment: message,
        visibility: {
            code: 'anyone'
        }
    };

    request({
        uri: 'https://api.linkedin.com/v1/people/~/shares?format=json',
        auth: {
            bearer: tokens.access_token
        },
        method: 'POST',
        json: true,
        body: post_data
    }, function (error, response, body){
        if(error)
            deferred.reject(new Error(error));
        else {
            if(body.status===400)   
                deferred.reject(new Error(body.message));
            else
                deferred.resolve(body);
        }
    });
    return deferred.promise;
}

exports.getOAuthURL=getOAuthURL;
exports.pushCode=pushCode;
exports.getUserInfo=getUserInfo;
exports.postMessage=postMessage;