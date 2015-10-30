'use strict';

const FACEBOOK_APP_ID ='1547209032221140';
const FACEBOOK_APP_SECRET ='77125a9aca3f82d53695d59329ca62f4';
const FACEBOOK_REDIRECT_URI = 'http://localhost:3000/facebook2callback';

var FBOAuthURL = 'https://graph.facebook.com/oauth/authorize?client_id='+FACEBOOK_APP_ID+'&redirect_uri='+FACEBOOK_REDIRECT_URI+'&scope=publish_actions+user_managed_groups';//+'&response_type=token';
var https = require('https');
var Q = require('q');
var request = require('request');
var token;

console.log("facebook auth URL: ", FBOAuthURL);

function pushCode(code) {

    var deferred = Q.defer();
    
    /// publish_actions
    var req_options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/v2.3/oauth/access_token?client_id='+FACEBOOK_APP_ID+'&redirect_uri='+FACEBOOK_REDIRECT_URI+'&client_secret='+FACEBOOK_APP_SECRET+'&code='+code,
        method: 'GET'
    };

    var req = https.request(req_options, function(res) {

        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            console.log("code validated ?  ",data);
            token = JSON.parse(data);
            deferred.resolve(token);
        });
    });
    
    req.on('error', function(e) {         
        console.log('upload url error: ', e);
        deferred.reject(new Error(e));
    });
    
    req.end();    
    
    return deferred.promise;
}

function sendVideo() {
    
    var deferred = Q.defer();
    
    var fs = require("fs");
    var filename = "server/test/uploadFile.mp4";
    var buf = fs.readFileSync(filename);
    var GROUP_ID = '334292563361295';
    // 'me'

    request({
        method: 'POST',
        uri: 'https://graph-video.facebook.com/v2.5/'+GROUP_ID+'/videos',
        formData: {
            access_token : token.access_token,
            source: fs.createReadStream(filename)
        }

    }, function(err, response, body) {

        if(err)
            deferred.reject(new Error(err));
        else {
            console.log('FB Video Upload Response: ' + response);
            deferred.resolve(body);  
        }
    });
    
    return deferred.promise;
}

exports.pushCode=pushCode;
exports.sendVideo=sendVideo;