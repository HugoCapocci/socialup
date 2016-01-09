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

exports.sendMusic = function(tokens, file, params) {
    
    //post https://api.mixcloud.com/upload/
    var formData= {
        mp3: fs.createReadStream(file.path),
        name : params.title,
        description : params.description
    };
    
    //5 tags max
    if(params.tags && params.tags.length>0) {
        for(var i=0; i<params.tags.length;i++) {
            formData['tags-'+i+'-tag']=params.tags[i];
        }
    }
    
    /* track sections
    sections-0-chapter=Introduction" \
     -F "sections-0-start_time=0" \
     -F "sections-1-artist=Artist Name" \
     -F "sections-1-song=Song Title" \
     -F "sections-1-start_time=10" \*/
    
    var deferred = Q.defer();
    request({
        method: 'POST',
        uri: 'https://api.mixcloud.com/upload/?access_token='+tokens.access_token,
        formData: formData
    }, function(err, response, body) {

        if(err)
            deferred.reject(err);
        else {
            //console.log('Mixcloud Upload Response body: ', body);
            var result = JSON.parse(body);
            if(result.error)
                deferred.reject(result);
            else
                deferred.resolve(result);           
        }
    });    
    return deferred.promise;
};

exports.listMedia = function(tokens) {

    var deferred = Q.defer();
    var req_options = {
        host: 'api.mixcloud.com',
        path: '/me/cloudcasts/?access_token='+tokens.access_token,
        method: 'GET'
    };
    var req = https.request(req_options, function(res) {
        var data="";
        res.on('data', function(chunk) {
            data+=chunk;
        });
        res.on('end', function() {
            //console.log("listMedia ", data);
            var results = JSON.parse(data);
            if(results.error) {
                console.log('mixcloud listMedia error: ', results.error.message);
                deferred.reject(results.error);
            } else {
                //console.log("listMedia ?  ",results);
                var counts={
                    listener:0, 
                    playback:0, 
                    repost:0, 
                    like:0, 
                    comment:0
                };
                var getStat = function(name) {
                    return { name : name, value : counts[name]};
                };
                var dataList = results.data.map(function(music) {
                    counts.listener += music.listener_count;
                    counts.playback += music.play_count;
                    counts.repost += music.repost_count;
                    counts.like += music.favorite_count;
                    counts.comment += music.comment_count; 
                    return {
                        id : music.key,
                        title : music.name,
                        creationDate : music.created_time,
                        streamURL : music.url,
                        thumbnailURL : music.pictures.medium,
                        description : music.description,
                        counts : {
                            listener : music.listener_count,
                            playback : music.play_count,
                            repost : music.repost_count,
                            like : music.favorite_count,
                            comment : music.comment_count
                        }
                    };
                });                
                deferred.resolve({
                    list : dataList, 
                    stats : [
                        getStat('listener'),
                        getStat('playback'),
                        getStat('repost'),
                        getStat('like'),
                        getStat('comment')
                    ]
                });
            }
        });
    });
    req.on('error', function(e) {         
        console.log('mixcloud listMedia error: ', e);
        deferred.reject(e);
    });
    req.end();
    return deferred.promise;
};