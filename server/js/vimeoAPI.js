'use strict';

/*
* VIMEO WEB API
  see https://developer.vimeo.com/api/
*/
var Q = require('q');
var request = require('request');
var https = require('https');
var fs = require('fs');

const CLIENT_ID = process.env.VIMEO_CLIENT_ID;
const CLIENT_SECRET = process.env.VIMEO_CLIENT_SECRET;
const REDIRECT_URL = process.env.APP_URL + '/vimeo2callback';

exports.getOAuthURL = function() {
    
    return "https://api.vimeo.com/oauth/authorize?response_type=code&client_id="+CLIENT_ID+"&redirect_uri="+REDIRECT_URL+"&scope="+encodeURI('public private purchased create edit delete upload interact');
};

exports.pushCode = function(code, userId) {

    var deferred = Q.defer();
    
    request({
        method : 'POST',
        uri :  'https://api.vimeo.com/oauth/access_token',
        auth : {
            user : CLIENT_ID,
            pass : CLIENT_SECRET
        },
        form : {
            grant_type : 'authorization_code',
            redirect_uri : REDIRECT_URL,
            code : code
        }
    }, function(err, response, body) {

        if(err) {
            console.log("Err: ",err);
            deferred.reject(err);
        } else {            
            var results = JSON.parse(body);
            //console.log('results ?', results);
            if(results.error) {
                deferred.reject(results);
            } else {
                deferred.resolve(results);
            }
        }
    });
    
    return deferred.promise;
};

exports.getUserInfo = function(tokens) {
    
    var deferred = Q.defer();
    //console.log("VIMEO TOKENS: ",tokens);
    var userInfo = {userName:tokens.user.name};
    delete tokens.user;
    deferred.resolve(userInfo);
    
    return deferred.promise;
};

exports.listVideos = function(tokens) {
    
    return processGetRequest(tokens.access_token, '/me/videos', function(response) {
        
        return response.data.map(function(video) {
            video.id=video.uri.substr(video.uri.lastIndexOf('/'));
            video.title=video.name;
            video.thumbnailURL = video.pictures.sizes[0].link;
            video.creationDate = video.created_time;            
           // console.log("vimeo video returned: ", video);
            return video;
        });
    });
};

//see https://developer.vimeo.com/api/upload/videos
exports.sendVideo = function(tokens, file, userId, params, providerOptions) {
    
    var deferred = Q.defer();
    var uploadLink;
    var completeURI;
    var videoId;
    generateUploadTicket(tokens).then(function(ticket) {
        console.log('upload to '+ticket.upload_link_secure);       
        uploadLink=ticket.upload_link_secure;
        completeURI=ticket.complete_uri;
        return publishVideo(ticket.upload_link_secure, tokens, file);
    
    }).then(function() {        
        return verifyUpload(uploadLink, tokens);
    }).then(function() {
        return finalizeUpload(completeURI, tokens);
        
    }).then(function(id) {
        videoId=id;
        console.log("finalizeUpload videoId: ", videoId);
        return patchMetadata(tokens, videoId, params.title, params.description, providerOptions);

    }).then(function() {
                    
        //tags
        //if(params.tags)
        //PUT https://api.vimeo.com/videos/{video_id}/tags/{word}
        deferred.resolve({
            url : 'https://vimeo.com/' +videoId
        });
    }).fail(function(err) {
        deferred.reject(err);
    });
    return deferred.promise;
};

function generateUploadTicket(tokens) {
    
    var deferred = Q.defer();
    request({
        method : 'POST',
        uri :  'https://api.vimeo.com/me/videos',
        auth : {
            bearer: tokens.access_token        
        },
        form : {
            type : 'streaming'
        }
    }, function(err, response, body) {

        if(err) {
            console.log("Err: ",err);
            deferred.reject(err);
        } else {            
            var results = JSON.parse(body);
            //console.log('results ?', results);
            if(results.error) {
                deferred.reject(results);
            } else {
                deferred.resolve(results);
            }
        }
    });
    return deferred.promise;
}

function publishVideo(uploadLink, tokens, file) {
      
    var deferred = Q.defer();
    var stat = fs.statSync(file.path);
    console.log("FILE SIZE ", stat.size);
    request({
        method : 'PUT',
        uri :  uploadLink,
        auth : {
            bearer: tokens.access_token
        },
        headers: {
            'Content-Length' : stat.size,
            'Content-Type': 'video/mp4'
        },
        body: fs.readFileSync(file.path)
    }, function(err, response, body) {

        if(err) {
            console.log("cannot publish the video. Err: ",err);
            deferred.reject(err);
        } else {            
           // var results = JSON.parse(body);
            console.log('publishVideo statusCode ?', response.statusCode);
            if(body.error) {
                deferred.reject(body.error);
            } else {
                deferred.resolve(body);
            }
        }
    });
    return deferred.promise;
}

function verifyUpload(uploadLink, tokens) {
   
    var deferred = Q.defer();
    request({
        method : 'PUT',
        uri :  uploadLink,
        auth : {
            bearer: tokens.access_token
        },
        headers: {
            'Content-Range': 'bytes */*'
        }
    }, function(err, response, body) {

        if(err) {
            console.log("cannot verifyUpload. Err: ",err);
            deferred.reject(err);
        } else {            
           // var results = JSON.parse(body);
            console.log('verifyUpload statusCode ?', response.statusCode);
            console.log("headers range: ",response.headers.range);
            if(body.error) {
                deferred.reject(body.error);
            } else {
                deferred.resolve(body);
            }
        }
    });
    return deferred.promise;
}

function finalizeUpload(completeURI, tokens) {
    
    console.log("completeURI? ",completeURI);

    var deferred = Q.defer();
    request({
        method : 'DELETE',
        uri :  'https://api.vimeo.com'+completeURI,
        auth : {
            bearer: tokens.access_token
        }
    }, function(err, response, body) {

        if(err) {
            console.log("cannot finalizeUpload. Err: ",err);
            deferred.reject(err);
        } else {
            if(response.statusCode != 201) {
                deferred.reject(body.error);
            } else {
                //console.log('headers: ',response.headers);
                var location = response.headers.location;
                deferred.resolve(location.substr(location.lastIndexOf('/')+1));
            }
        }
    });
    return deferred.promise;
}

function patchMetadata(tokens, videoId, title, description, providerOptions) {
    
    console.log("vimeo patchMetadata providerOptions", providerOptions);
    var deferred = Q.defer();
    request({
        method : 'PATCH',
        json : true,
        uri :  'https://api.vimeo.com/videos/'+videoId,
        auth : {
            bearer: tokens.access_token
        },
        body : {
            name: title,
            description: description,
            privacy : {
                view : providerOptions.privacyStatus
            }
        }
    }, function(err, response, body) {

        if(err) {
            console.log("cannot patchMetadata. Err: ",err);
            deferred.reject(err);
        } else {            
            console.log('patchMetadata statusCode ?', response.statusCode);
            //var results = JSON.parse(body);
            if(body.error) {
                deferred.reject(body.error);
            } else {
                deferred.resolve();
            }
        }
    });
    return deferred.promise;
}

function processGetRequest(access_token, path, callback) {
    
    var deferred = Q.defer();
    var req_options = {
        host: 'api.vimeo.com',
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