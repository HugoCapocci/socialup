'use strict';
var https = require('https');
var http = require('http');
var Q = require('q');
var fs = require('fs');
var querystring = require('querystring');

//TODO externaliser dans variables denvironnement, git-ignored
const DAILYMOTION_API_KEY ='899e322efb0511cecc7b';
const DAILYMOTION_API_SECRET ='fb3ee342efb21270242f20c70e31a16ce1feee0c';
const DAILYMOTION_REDIRECT_URL = 'http://localhost:3000/dailymotion2callback';

var token= {};

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
            //console.log('Response: ' + chunk);
            //TODO save the tokens
            token = JSON.parse(chunk);
            deferred.resolve(chunk);
            
            /*
            https://developer.dailymotion.com/api#video-upload
            GET /videos HTTP/1.1
            Host: api.dailymotion.com
            Authorization: Bearer <ACCESS_TOKEN>
            */
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
    
    console.log('send video using access token: ',token.access_token);
    
    getUploadURL().then(function(urls) {
        //upload_url
        //progress_url
        
        console.log("curl to " ,urls.upload_url);
        
        /*var urlComponent = urls.upload_url.replace('http://','').split('/upload?');
        console.log("urlComponent: ", urlComponent);
        var fs = require('fs');
        var filename = "server/test/uploadFile.flv";
        var buf = fs.readFileSync(filename);
        var stat = fs.statSync(filename);
        var post_data = querystring.stringify({
            'file' : buf
        });

        var post_options = {
            host: urlComponent[0],
            port: 80,
            path: '/upload?'+urlComponent[1],
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data',
                'Content-Length': post_data.length
            }
        };
        console.log("file length: ", stat.size);
        console.log("post_data length: ", post_data.length);
        var post_req = http.request(post_options, function(res) {
            //console.log('htp request for video upload done '+ res.statusCode + ' ' +res.statusMessage);
            console.log('htp request for video upload done ', res);
            //res.setEncoding('utf8');
            res.on('data', function (chunk) {
                console.log('upload response: ', chunk);
            });
            res.on('end', function() {
                console.log('http post ends'); 
            });
        });
       
        post_req.on('error', function(e) {
            console.error(e);
        });
        
         // post the data
        post_req.write(post_data);
        post_req.end();*/
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
        console.error(e);
        deferred.reject(new Error(e));
    });
    
    req.end();
    return deferred.promise;
}

exports.sendVideo=sendVideo;
exports.pushCode=pushCode;