'use strict';

/*
* SOUNDCLOUD WEB API
  see https://developers.soundcloud.com/docs/api/guide
*/

var https = require('https');
var http = require('http');
var request = require('request');
var Q = require('q');
var fs = require('fs');
var querystring = require('querystring');

const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
const CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET;
const REDIRECT_URI = process.env.APP_URL + '/soundcloud2callback';

exports.getOAuthURL = function() {
    return 'https://soundcloud.com/connect?client_id='+CLIENT_ID+'&redirect_uri='+REDIRECT_URI+'&response_type=code';
};

exports.pushCode = function(code, userId) {
    
    console.log("pushing code: ",code);

    var deferred = Q.defer();
    var post_data = querystring.stringify({
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri' : REDIRECT_URI,
        'grant_type' : 'authorization_code',
        'code' : code
    });
    var req_options = {
        host: 'api.soundcloud.com',
        port: 443,
        path: '/oauth2/token',
        method: 'POST',
        headers: {
            'Content-Length': post_data.length
        }
    };
    var req = https.request(req_options, function(res) {

        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            console.log("soundcloud code validated ? ", data);
            if(!data)
                deferred.reject(new Error("No data returned by soundloud"));
            else
                deferred.resolve(JSON.parse(data));
        });
    });

    req.on('error', function(e) {         
        console.log('soundcloud authentication error: ', e);
        deferred.reject(e);
    });
    // post the data
    req.write(post_data);
    req.end();    
    return deferred.promise;
};

exports.getUserInfo = function(tokens) {

// https://api.soundcloud.com/me?oauth_token=A_VALID_TOKEN
    var deferred = Q.defer();
    var req_options = {
        host: 'api.soundcloud.com',
        path: '/me/?oauth_token='+tokens.access_token,
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
                console.log('soundcloud authentication error: ', results.error.message);
                deferred.reject(results.error);
            } else {
                //console.log("user info ?  ",results);                
                deferred.resolve({userName:results.username, id : results.id});
            }
        });
    });
    req.on('error', function(e) {         
        console.log('soundcloud authentication error: ', e);
        deferred.reject(e);
    });    
    req.end();    
    return deferred.promise;

};

exports.sendMusic = function(tokens, file, params) {

    console.log('Soundcloud sendMusic');
    var deferred = Q.defer();

    request({
        method: 'POST',
        json: true,
        uri: 'https://api.soundcloud.com/tracks',//?client_id='+CLIENT_ID,
        formData: {
            oauth_token : tokens.access_token,
            /*track: {*/
                asset_data : fs.createReadStream(file.path),
                title : params.title,
               // description : params.description
                sharing : 'private'
            /*}*/            
        }
    }, function(err, response, body) {

        if(err)
            deferred.reject(err);
        else {
            console.log('Soundcloud Upload Response body: ', body);
            console.log("response.statusCode: ",response.statusCode);
            if(response.statusCode >= 400)
                deferred.reject(body);
            else
                deferred.resolve(JSON.parse(body));           
        }
    });    
    return deferred.promise;
};

exports.listMedia = function(tokens) {

    var deferred = Q.defer();
    var req_options = {
        host: 'api.soundcloud.com',
        path: '/me/tracks?oauth_token='+tokens.access_token,
        method: 'GET'
    };
    var req = https.request(req_options, function(res) {
        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            //console.log("soundcloud list musics?  ",data);   
            var results = JSON.parse(data);
            if(results.error) {
                console.log('soundcloud list musics error: ', results.error.message);
                deferred.reject(results.error);
            } else {
                             
                deferred.resolve({
                    list :results.map(function(music) {
                        return {
                            id : music.id,
                            title : music.title,
                            creationDate : music.created_at,
                            streamURL : music.stream_url,
                            thumbnailURL : music.artwork_url,
                            description : music.description,
                            playbackCount : music.playback_count,
                            downloadCount : music.download_count,
                            likes : music.favoritings_count,
                            commentsCount : music.comment_count
                        };
                    })
                });
            }
        });
    });
    req.on('error', function(e) {         
        console.log('soundcloud authentication error: ', e);
        deferred.reject(e);
    });    
    req.end();    
    return deferred.promise;

};