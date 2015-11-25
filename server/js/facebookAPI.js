'use strict';

/**
* FACEBOOK WEB API
* see https://developers.facebook.com/docs/graph-api/using-graph-api/v2.5
*/

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_REDIRECT_URI = process.env.APP_URL + '/facebook2callback';

var https = require('https');
var Q = require('q');
var request = require('request');
var fs = require("fs");

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

function tagsAsHashtags(tags) {

    var hastags="\n\n";
    for (var i=0; i<tags.length; i++) {
       hastags+="#"+tags[i]+" ";   
    }
    return hastags;
}

function sendVideo(token, file, user, params) {
    
    var deferred = Q.defer();
    var GROUP_ID = '334292563361295';
    // 'me'
    request({
        method: 'POST',
        uri: 'https://graph-video.facebook.com/v2.5/'+GROUP_ID+'/videos',
        formData: {
            access_token : token.access_token,
            source: fs.createReadStream(file.path),
            title : params.title,
            description : params.description + tagsAsHashtags(params.tags)
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

function getOAuthURL() {
    return 'https://graph.facebook.com/oauth/authorize?client_id='+FACEBOOK_APP_ID+'&redirect_uri='+FACEBOOK_REDIRECT_URI+'&scope=publish_actions+user_managed_groups';//+'&response_type=token';
}

function postMessage(tokens, message) {

    var deferred = Q.defer();
    request({
        method: 'POST',
        uri: 'https://graph.facebook.com/me/feed',
        formData: {
            access_token : tokens.access_token,
            message: message
        }

    }, function(err, response, body) {

        if(err)
            deferred.reject(new Error(err));
        else {
            console.log('FB Message Response: ' + response);
            deferred.resolve(body);  
        }
    });
    return deferred.promise;
}

exports.pushCode=pushCode;
exports.sendVideo=sendVideo;
exports.getOAuthURL=getOAuthURL;
exports.postMessage=postMessage;