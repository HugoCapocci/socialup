'use strict';

/**
* FACEBOOK WEB API
* see https://developers.facebook.com/docs/graph-api/using-graph-api/v2.5
*/

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_REDIRECT_URI = process.env.APP_URL + '/facebook2callback';

var querystring = require('querystring');
var https = require('https');
var Q = require('q');
var request = require('request');
var fs = require("fs");
var userDAO = require('./userDAO.js');

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

function refreshTokens(tokens, userId) {
    
    var deferred = Q.defer();
    var req_options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/v2.3/oauth/access_token?grant_type=fb_exchange_token&client_id='+FACEBOOK_APP_ID+'&redirect_uri='+FACEBOOK_REDIRECT_URI+'&client_secret='+FACEBOOK_APP_SECRET+'&fb_exchange_token='+tokens.access_token,
        method: 'GET'
    };

    var req = https.request(req_options, function(res) {

        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            console.log("code validated ?  ",data);
            var refreshedToken = JSON.parse(data);
            deferred.resolve( saveTokensForUser(refreshedToken, userId) );
        });
    });
    
    req.on('error', function(e) {         
        console.log('upload url error: ', e);
        deferred.reject(e);
    });
    
    req.end();

    return deferred.promise;
}

function saveTokensForUser(tokens, userId) {

    tokens.expiry_date = Date.now() + tokens.expires_in;
    delete tokens.expires_in;
    userDAO.updateUserTokens(userId, 'facebook', tokens);
    return tokens;
}

function tagsAsHashtags(tags) {
    if(tags===undefined)
        return "";
    
    var hastags="\n\n";
    for (var i=0; i<tags.length; i++) {
       hastags+="#"+tags[i]+" ";   
    }
    return hastags;
}

exports.getUserGroups = function(tokens) {
    
    return processGetRequest(tokens.access_token, '/me/groups', function(groupsData) {
        return groupsData.data;
    });

};

function sendVideo(token, file, user, params, providerOptions) {

    //TODO use providerOptions to choose between profil and group
    //and set visibility
    
    var deferred = Q.defer();
    //current user by default
    var targetId = 'me';
    //post on group 
    if(providerOptions.group !== undefined)
        targetId = providerOptions.group.id;
    //post on page 
    //TODO
 /*   if(providerOptions===undefined)
        data.privacy = {'value':'SELF'};
    else
       data.privacy = {'value':providerOptions.visibility};*/
    request({
        method: 'POST',
        uri: 'https://graph-video.facebook.com/v2.5/'+targetId+'/videos',
        formData: {
            access_token : token.access_token,
            source: fs.createReadStream(file.path),
            title : params.title,
            description : params.description + tagsAsHashtags(params.tags)
        }

    }, function(err, response, body) {

        if(err)
            deferred.reject(err);
        else {
            console.log('FB Video Upload Response body: ', body);
            var videoId = JSON.parse(body).id;
            /*getVideoData(videoId, token).then(function(videoData) {
                console.log("videoData: ",videoData);
                  //return url to the video*/
                deferred.resolve( {
                    url : 'https://www.facebook.com/'+videoId
                });  
            /*},function(err) {
                deferred.reject(err);
            });*/
        }
    });    
    return deferred.promise;
}

///v2.5/{video-id}
function getVideoData(videoId, tokens) {

    return processGetRequest(tokens.access_token, '/'+videoId+'/thumbnails', function(videoData) {
        return videoData;
    });
}

//https://developers.facebook.com/docs/facebook-login/permissions
function getOAuthURL() {
    return 'https://graph.facebook.com/oauth/authorize?client_id='+FACEBOOK_APP_ID+'&redirect_uri='+FACEBOOK_REDIRECT_URI+'&scope=public_profile +publish_actions+user_posts+user_managed_groups+manage_pages';//+'&response_type=token'
}

function postMessage(tokens, message, providerOptions) {
    return publishOnFeed(tokens, {message : message}, providerOptions);
}
exports.postMediaLink = function(tokens, message, url, title, description, providerOptions ) {

    return publishOnFeed(tokens, {message:message, link:url, name: title, caption:description, description:description}, providerOptions);
};
function publishOnFeed(tokens, data, providerOptions) {

    data.access_token = tokens.access_token;
    //console.log("publishOnFeed data: ", data);
    if(providerOptions===undefined)
        data.privacy = {'value':'SELF'};
    else
       data.privacy = {'value':providerOptions.visibility};

    var deferred = Q.defer();
    request({
        method: 'POST',
        uri: 'https://graph.facebook.com/me/feed',
        json: true,
        body: data
    }, function(err, response, body) {

        if(err)
            deferred.reject(err);
        else {
            console.log("publishOnFeed response body: ", body);
            var id = body.id;
            body.url= 'https://www.facebook.com/yug357/posts/'+id.split('_')[1];
            deferred.resolve(body);  
        }
    });
    return deferred.promise;
}

exports.getPages = function(tokens) {
    
    return processGetRequest(tokens.access_token, '/me/accounts', function(pages) {
        console.log("Facebook users pages: ", pages.data);
        return pages.data;
    });
};

//TODO get events (created by user / where user is admin) https://developers.facebook.com/docs/graph-api/reference/user/promotable_events/

function getUserInfo(tokens)  {
    
    return processGetRequest(tokens.access_token, '/me', function(userInfo) {
        return {userName:userInfo.name};
    });
}

function processGetRequest(access_token, path, callback) {
    
    var deferred = Q.defer();
    var req_options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/v2.5'+path,
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
    req.on('error', function(e) {         
        console.log('processRequest error: ', e);
        deferred.reject(e);
    });
    req.end();
    
    return deferred.promise;
}

exports.pushCode=pushCode;
exports.sendVideo=sendVideo;
exports.getOAuthURL=getOAuthURL;
exports.postMessage=postMessage;
exports.refreshTokens=refreshTokens;
exports.getUserInfo=getUserInfo;
exports.getVideoData=getVideoData;