'use strict';
var https = require('https');
var http = require('http');
var request = require('request');
var Q = require('q');
var fs = require('fs');
var querystring = require('querystring');

//TODO externaliser dans variables denvironnement, git-ignored
const DAILYMOTION_API_KEY = process.env.DAILYMOTION_API_KEY;
const DAILYMOTION_API_SECRET = process.env.DAILYMOTION_API_SECRET;
const DAILYMOTION_REDIRECT_URL = process.env.APP_URL + '/dailymotion2callback';

var token;

function pushCode(code) {

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
            token = JSON.parse(chunk);
            deferred.resolve(token);      
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

function sendVideo() {
    
    var deferred = Q.defer();
    
    getUploadURL().then(function(urls) {
        //upload_url
        //progress_url        
        console.log("curl to " ,urls.upload_url);        
       /* var urlComponent = urls.upload_url.replace('http://','').split('/upload?');
        console.log("urlComponent: ", urlComponent);*/
        var fs = require('fs');
        var filename = "server/test/uploadFile.mp4";
               
        //test with request API 
        request({
            method: 'POST',
            uri:    urls.upload_url,
            auth:   {
                bearer: token.access_token
            },
            formData: {
                file: fs.createReadStream(filename)
            }
        }, function(err, response, body) {
            
            if(err)
                deferred.reject(new Error(err));
            else {
                var videoURL = JSON.parse(body).url;
                console.log("video uploaded to URL: ", videoURL);
                publishVideo(videoURL, deferred);
            }
        });
    });
    return deferred.promise;
}

function publishVideo(videoURL, deferred) {
    
    request({
        method : 'POST',
        uri :  'https://api.dailymotion.com/me/videos',
        auth : {
            bearer: token.access_token
        },
        form : {
            url: videoURL,
            title : 'test',
            channel : 'drhelmut',
            description : 'test',
            tags : ['popopo', 'WTC'],
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

function getUploadURL() {
    
    var deferred = Q.defer();

    var req_options = {
        host: 'api.dailymotion.com',
        port: 443,
        path: '/file/upload',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer '+token.access_token
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
            //console.log("upload url? ",data);
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

function getUserInfo()  {
    
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
    
exports.sendVideo=sendVideo;
exports.pushCode=pushCode;
exports.getUserInfo=getUserInfo;