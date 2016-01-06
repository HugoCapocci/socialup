'use strict';

/*
* DAILYMOTION WEB API
  see https://developer.dailymotion.com/api 
      https://developer.dailymotion.com/tools/apiexplorer
*/
var https = require('https');
var http = require('http');
var request = require('request');
var Q = require('q');
var fs = require('fs');
var querystring = require('querystring');
var userDAO = require('./userDAO.js');

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
            //TODO save refreshed token
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

exports.listMedia = function(tokens) {
    
    return processGetRequest(tokens.access_token,'/user/me/videos?fields=id,thumbnail_60_url,title,description,status,created_time', function(videos) {
        //console.log("raw videos result: ", videos);
        return videos.list.map(function(video) {
            video.thumbnailURL = video.thumbnail_60_url;
            video.creationDate = new Date(video.created_time*1000);
            delete video.thumbnail_60_url;
            delete video.created_time;
            return video;
        });
    });
};

function sendVideo(tokens, file, userId, params, providerOptions) {
    
    var deferred = Q.defer();
    //always check tokens validity before use
    getUploadURL(tokens).then(function(urls) {

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
                deferred.reject(err);
            else {                
                //console.log("body ?", body);
                var videoURL = JSON.parse(body).url;
                //console.log("video uploaded to URL: ", videoURL);
                publishVideo(videoURL, tokens, params, providerOptions, deferred);
            }
        });
    });
    return deferred.promise;
}

// see https://developer.dailymotion.com/api#video-upload
function publishVideo(videoURL, tokens, params, providerOptions, deferred) {
        
    request({
        method : 'POST',
        uri :  'https://api.dailymotion.com/me/videos',
        auth : {
            bearer: tokens.access_token
        },
        form : {
            url: videoURL,
            title : params.title,
            channel : providerOptions.channel.id,
            description : params.description,
            tags : params.tags,
            published : true,
            private : providerOptions.private ? providerOptions.private : false/*,
            password : 'zadazdazdazd',
            rental_duration : '3' '24' '48' ,
            rental_price : '1.14',
            rental_start_time : 10*/ 
        }
    }, function(err, response, body) {

        if(err) {
            console.log("cannot publish the video. Err: ",err);
            deferred.reject(new Error(err));
        } else {
            
            var results = JSON.parse(body);
            console.log('video published on dailymotion with results ?', results);
            //{ id: 'x3godf5', title: 'chat', channel: 'news', owner: 'xglgo' }
            if(results.error) {
                deferred.reject(new Error(results.error.message));
            } else {
                deferred.resolve({
                    url :'http://www.dailymotion.com/video/'+results.id+'_'+results.title+'_'+results.channel,
                    thumbnail : 'http://www.dailymotion.com/thumbnail/video/'+results.id
                });
            }
        }
    });
}

function getUploadURL(tokens) {

    return processGetRequest(tokens.access_token,'/file/upload', function(url) {
         return url;
    });
}

function getUserInfo(tokens)  {
    
    return processGetRequest(tokens.access_token,'/user/me?fields=id,screenname,email', function(userInfo) {
         return {userName:userInfo.screename};
    });
}

exports.listCategories = function(tokens, userId) {
    
    var deferred = Q.defer();
    checkAccessTokenValidity(tokens, userId).then(function(validTokens) {
        deferred.resolve(
            processGetRequest(validTokens.access_token,'/channels', function(results) {
                return results.list.map(function(categorie) {
                    delete categorie.description;
                    return categorie;
                });
            })
        );
    }, function (err) {
         deferred.reject(err);
    });
    return deferred.promise;
};

function processGetRequest(access_token, path, callback) {
    
    var deferred = Q.defer();

    var req_options = {
        host: 'api.dailymotion.com',
        port: 443,
        path: path,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer '+access_token
        }
    };

    var req = https.request(req_options, function(res) {
        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            deferred.resolve(callback(JSON.parse(data)));
        });
    });
    req.on('error', function(err) {         
        deferred.reject(err);
    });
    req.end();
    return deferred.promise;
}

exports.getOAuthURL=getOAuthURL;
exports.sendVideo=sendVideo;
exports.pushCode=pushCode;
exports.getUserInfo=getUserInfo;
exports.refreshTokens=refreshTokens;