'use strict';

/*
* DAILYMOTION WEB API
*/
var https = require('https');
var http = require('http');
var request = require('request');
var Q = require('q');
var fs = require('fs');
var querystring = require('querystring');
var userDAO = require('./userDAO.js');

//TODO externaliser dans variables denvironnement, git-ignored
const DAILYMOTION_API_KEY = process.env.DAILYMOTION_API_KEY;
const DAILYMOTION_API_SECRET = process.env.DAILYMOTION_API_SECRET;
const DAILYMOTION_REDIRECT_URL = process.env.APP_URL + '/dailymotion2callback';

function getOAuthURL() {
    
    return "https://www.dailymotion.com/oauth/authorize?response_type=code&client_id="+DAILYMOTION_API_KEY+"&redirect_uri="+DAILYMOTION_REDIRECT_URL+"&scope=userinfo+email+manage_videos+manage_playlists";
}

// retrieve auth token from auth code
function pushCode(code, userId) {

    var deferred = Q.defer();
    
    //ask for token
    var post_data = querystring.stringify({
        'grant_type' : 'authorization_code',
        'client_id': DAILYMOTION_API_KEY,
        'client_secret': DAILYMOTION_API_SECRET,
        'redirect_uri' : DAILYMOTION_REDIRECT_URL,
        'code' : code
    });
    
    var post_options = {
        host: 'api.dailymotion.com',
        port: 443,
        path: '/oauth/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': post_data.length
        }
    };

    var post_req = https.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            var tokens =JSON.parse(chunk);
            deferred.resolve( saveTokensForUser(tokens, userId) );
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

function saveTokensForUser(tokens, userId) {

    tokens.expiry_date = Date.now() + tokens.expires_in;
    delete tokens.expires_in;
    userDAO.updateUserTokens(userId, 'dailymotion', tokens);
    return tokens;
}

function checkAccessTokenValidity(tokens, userId) {
  
   // console.log("tokens? ", tokens);  
    var deferred = Q.defer();
    if(tokens.expiry_date <= Date.now() ) {
        console.log("refresh dailymotion oauth token ");
        return refreshTokens(tokens, userId);
    } else {
        deferred.resolve(tokens);
        return deferred.promise;
    }
} 

/*
    see https://developer.dailymotion.com/api#using-refresh-tokens
*/
function refreshTokens(tokens, userId) {
    
    var deferred = Q.defer();
    
    //ask for token
    var post_data = querystring.stringify({
        'grant_type' : 'refresh_token',
        'client_id': DAILYMOTION_API_KEY,
        'client_secret': DAILYMOTION_API_SECRET,
       /* 'redirect_uri' : DAILYMOTION_REDIRECT_URL,*/
        'refresh_token' : tokens.refresh_token
    });
    
    var post_options = {
        host: 'api.dailymotion.com',
        port: 443,
        path: '/oauth/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': post_data.length
        }
    };

    var post_req = https.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            var tokens = JSON.parse(chunk);
            deferred.resolve( saveTokensForUser(tokens, userId) );
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

function sendVideo(tokens, file, userId, params) {
    
    var deferred = Q.defer();
    //always check tokens validity before use
    checkAccessTokenValidity(tokens, userId).then(function(validTokens) {

        tokens=validTokens;
        return getUploadURL(validTokens);
    
    }).then(function(urls) {

        //test with request API 
        request({
            method: 'POST',
            uri: urls.upload_url,
            auth: {
                bearer: tokens.access_token
            },
            formData: {
                file: fs.createReadStream(file.path)
            }
        }, function(err, response, body) {
            
            if(err)
                deferred.reject(new Error(err));
            else {
                
                console.log("body ?", body);
                var videoURL = JSON.parse(body).url;
                console.log("video uploaded to URL: ", videoURL);
                publishVideo(videoURL, tokens, params, deferred);
            }
        });
    });
    return deferred.promise;
}

function publishVideo(videoURL, tokens, params, deferred) {
        
    request({
        method : 'POST',
        uri :  'https://api.dailymotion.com/me/videos',
        auth : {
            bearer: tokens.access_token
        },
        form : {
            url: videoURL,
            title : params.title,
            channel : 'drhelmut',
            description : params.description,
            tags : params.tags,
            published : true
        }
    }, function(err, response, body) {

        if(err) {
            console.log("cannot publish the video. Err: ",err);
            deferred.reject(new Error(err));
        } else { 
            console.log("video published with response body ?", body);
            deferred.resolve();
        }
    });
}

function getUploadURL(tokens) {
        
    var deferred = Q.defer();

    var req_options = {
        host: 'api.dailymotion.com',
        port: 443,
        path: '/file/upload',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer '+tokens.access_token
        }
    };

    var req = https.request(req_options, function(res) {
        /*console.log("statusCode: ", res.statusCode);
        console.log("headers: ", res.headers);*/
        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            console.log("dailymotion upload url? ",data);
            deferred.resolve(JSON.parse(data));
        });
    });
    
    req.on('error', function(e) {         
        console.log('upload url error: ', e);
        deferred.reject(new Error(e));
    });
    
    req.end();
    return deferred.promise;
}

function getUserInfo(token)  {
    
    var deferred = Q.defer();

    var req_options = {
        host: 'api.dailymotion.com',
        port: 443,
        path: '/user/me?fields=id,screenname,email',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer '+token.access_token
        }
    };

    var req = https.request(req_options, function(res) {

        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            deferred.resolve(JSON.parse(data));
        });
    });
    
    req.on('error', function(e) {         
        console.log('get user infos error: ', e);
        deferred.reject(new Error(e));
    });
    
    req.end();
    return deferred.promise;
}

exports.getOAuthURL=getOAuthURL;
exports.sendVideo=sendVideo;
exports.pushCode=pushCode;
exports.getUserInfo=getUserInfo;