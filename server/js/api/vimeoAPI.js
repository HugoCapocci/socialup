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

const DESCRIPTION_MAX_LENGTH = 1250;

var unauthenticatedToken;

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

function getUnauthenticatedToken() {
    
     var deferred = Q.defer();    
    request({
        method : 'POST',
        uri :  'https://api.vimeo.com/oauth/authorize/client',
        auth : {
            user : CLIENT_ID,
            pass : CLIENT_SECRET
        },
        form : {
            grant_type : 'client_credentials',
            redirect_uri : REDIRECT_URL
        }
    }, function(err, response, body) {

        if(err) {
            console.log("Err: ",err);
            deferred.reject(err);
        } else {            
            var results = JSON.parse(body);
            console.log('UnauthenticatedToken ?', results);
            if(results.error) {
                deferred.reject(results);
            } else {
                unauthenticatedToken=results;
                deferred.resolve(results);
            }
        }
    });
    
    return deferred.promise;
}

exports.getUserInfo = function(tokens) {
    
    var deferred = Q.defer();
    //console.log("VIMEO TOKENS: ",tokens);
    var userInfo = {userName:tokens.user.name};
    delete tokens.user;
    deferred.resolve(userInfo);
    
    return deferred.promise;
};

exports.listMedia = function(tokens) {
    
    return processGetRequest(tokens.access_token, '/me/videos', function(response) {
        
        var counts={
            view:0,
            comment:0,
            like:0
        };
        var getStat = function(name) {
            return { name : name, value : counts[name]};
        };
        
        // video.stats .plays
        //video.metadata.connections comments.total likes.total 
        return {
            list : response.data.map(function(video) {
                video.id=video.uri.substr(video.uri.lastIndexOf('/')+1);
                video.title=video.name;
                video.thumbnailURL = video.pictures.sizes[0].link;
                video.creationDate = video.created_time;            
               // console.log("vimeo video returned: ", video);
                counts.view += video.stats.plays;
                counts.comment += video.metadata.connections.comments.total;
                counts.like += video.metadata.connections.likes.total;
                video.counts = {
                    view : video.stats.plays,
                    comment : video.metadata.connections.comments.total,
                    like : video.metadata.connections.likes.total
                };
                delete video.stats;
                delete video.metadata.connections;
                return video;
            }),
            stats : [
                getStat('view'),
                getStat('comment'),
                getStat('like')
            ]
        };
    });
};

exports.searchVideo = function(videoName, limit, order, page) {
    
    var url = '/videos?query='+encodeURI(videoName)+'&per_page='+limit;
    
    if(page)
        url+='&page='+page;
    
    var sort = processOrder(order);
    url+='&sort='+sort;
        
    return processGetRequest(unauthenticatedToken.access_token, url, function(response) {
    
        return {
            videos : response.data.map(function(result) {
                
                var video = {};
                video.id=result.uri.substr(result.uri.lastIndexOf('/')+1);
                video.title=result.name;
                video.thumbnailURL = result.pictures.sizes[0].link;
                video.creationDate = result.created_time;
                if(result.description && result.description.length> DESCRIPTION_MAX_LENGTH)
                     video.description=result.description.substr(0, DESCRIPTION_MAX_LENGTH);
                else
                    video.description=result.description;
                video.duration=result.duration;
                video.channel = result.user.name;
                video.channelURL = result.user.link;
               // console.log("vimeo video returned: ", video);               
                video.counts = {
                    view : result.stats.plays,
                    comment : result.metadata.connections.comments.total,
                    like : result.metadata.connections.likes.total
                };
               
                return video;
            }),
            totalResults :  response.total,
            next : response.next,
            previous : response.previous,
            first: response.first,
            last : response.last,
            page : response.page
        };
    });
    
};

/*relevant
date
alphabetical
plays
likes
comments
duration*/
function processOrder(order) {
 
    switch(order) {
        case 'date' :
            return 'date';
        case 'rating' :
            return 'likes';
        case 'relevance' :
            return 'relevant';
        case 'viewCount' :
            return 'plays';
        default :
            return undefined;
    }

}

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
        headers : {
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

//onload
getUnauthenticatedToken();