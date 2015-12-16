'use strict';

/*
* DROP BOX WEB API
* see https://www.dropbox.com/developers-v1/core/docs, https://dropbox.github.io/dropbox-api-v2-explorer/
*/

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const DROPBOX_REDIRECT_URI = process.env.APP_URL + '/dropbox2callback';

const END_POINT = 'api.dropboxapi.com';

var https = require('https');
var Q = require('q');
var request = require('request');
var fs = require("fs");
var querystring = require('querystring');

// https://api.dropboxapi.com/1/oauth2/token
function pushCode(code) {

    var deferred = Q.defer();

    //ask for token
    var post_data = querystring.stringify({
        'client_id': DROPBOX_APP_KEY,
        'client_secret': DROPBOX_APP_SECRET,
        'redirect_uri' : DROPBOX_REDIRECT_URI,
        'grant_type' : 'authorization_code',
        'code' : code
    });
    
    var post_options = {
        host: END_POINT,
        port: 443,
        path: '/1/oauth2/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': post_data.length
        }
    };

    var post_req = https.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            deferred.resolve(JSON.parse(chunk));
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

function listFiles(token, path, typeFilter) {
    
    if(path===undefined || path ==='root')
        path='';
    else 
        path = decodeURI(path);
    
    return retrieveAllFiles(token, path, typeFilter);
}

function retrieveAllFiles(token, path, typeFilter) {
    
    var deferred = Q.defer();
    var post_data = {
        path: path,
        recursive: false,
        include_media_info: false
    };

    request({
        uri: 'https://'+END_POINT+'/2/files/list_folder',
        auth: {
            bearer: token.access_token
        },
        method: "POST",
        json: true,
        body: post_data
    }, function (error, response, body){
        if(error)
            deferred.reject(error);
        else {            
            var results = [];
            body.entries.forEach(function(entry) {
                if(typeFilter === 'folder') {
                    if(entry['.tag'] === 'folder')
                        results.push({
                           name : entry.name, id: entry.path_lower, mimeType : entry['.tag'], isFolder : entry['.tag'] === 'folder'
                        });
                //TODOfile type filter
                } else
                    results.push({
                        name : entry.name, id: entry.path_lower, mimeType : entry['.tag'], isFolder : entry['.tag'] === 'folder'
                    });
            });
            deferred.resolve(results);
        }
    });
    return deferred.promise;
}

/*function searchFiles(token, path, typeFilter) {
    
    var deferred = Q.defer();
  
    var post_data = {
        path: path,
        query : '*',
        mode: 'filename'
    };

    request({
        uri: 'https://'+END_POINT+'/2/files/search',
        auth: {
            bearer: token.access_token
        },
        method: "POST",
        json: true,
        body: post_data
    }, function (error, response, body){
        console.log(response);
        if(error)
            deferred.reject(error);
        else {   
            if(body.matches) {
                console.log("files found ", body.matches);
                deferred.resolve(body.matches.map(function(entry) {
                    return {
                       name : entry.name, id: entry.path_lower, mimeType : entry['.tag'], isFolder : entry['.tag'] === 'folder'
                    };
                }));
            } else
                deferred.resolve();
        }
    });
    return deferred.promise;
}*/

exports.getFileMetaData = function(tokens,filePath) {

    return processGetRequest(tokens.access_token, 'https://content.dropboxapi.com/1/files/auto/'+encodeURIComponent(filePath), function(fileContent, response) {
        //console.log("response.headers: ",response.headers);
        var metaData = JSON.parse(response.headers['x-dropbox-metadata']);
         /*console.log("metaData ", metaData);
        console.log("file size in byte ", metaData.bytes);
        console.log("file mime_type ", metaData.mime_type);
        console.log("content size ? ", fileContent.length);*/
        metaData.fileName = metaData.path.substring(metaData.path.lastIndexOf('/')+1);
        return metaData;
    });
};

exports.downloadFile = function(tokens,filePath) {

    return request({
        uri: 'https://content.dropboxapi.com/1/files/auto/'+encodeURIComponent(filePath),
        auth: {
            bearer: tokens.access_token
        },
        method: "GET"
    });
};

function uploadDrive(tokens, file, path) {
    
    var deferred = Q.defer();
    /* 
    var post_data = querystring.stringify({
        'mode': 'overwrite',
        'autorename': true,
        'mute': false
    });
    */
    var url='https://content.dropboxapi.com/1/files_put/auto';
    if(path!==undefined)
        url+=encodeURIComponent(path);
    url+='/'+file.originalname;

    request({
        uri : url,
        auth: {
            bearer: tokens.access_token
        },
        method: "POST",
        body: fs.readFileSync(file.path)
    }, function (error, response, body){
      
        if(error)
            deferred.reject(error);
        else {
            //console.log("dropbox API upload response body? ", body);
            var results ={
                url : 'https://www.dropbox.com/home/Camera%C2%A0Uploads?preview='+file.originalname
            };            
            deferred.resolve(results);
        }
    });    
    return deferred.promise;    
}

function getOAuthURL() {
    //add require_role    
    return 'https://www.dropbox.com/1/oauth2/authorize?client_id='+DROPBOX_APP_KEY+'&redirect_uri='+DROPBOX_REDIRECT_URI+'&response_type=code';
}

function getUserInfo(tokens) {    

    return processGetRequest(tokens.access_token, 'https://'+END_POINT+'/1/account/info', function(userInfo) {
        return {userName:JSON.parse(userInfo).display_name};
    });
}

function processGetRequest(access_token, url, callback) {
    
    var deferred = Q.defer();
    request({
        uri: url,
        auth: {
            bearer: access_token
        },
        method: "GET"
    }, function (error, response, body){
        //console.log("processGetRequest body ",body);
        if(error)
            deferred.reject(error);
        else { 
            deferred.resolve(callback(body, response) );
        }
    }).pipe(fs.createWriteStream('steampunk.jpg'));
    return deferred.promise;
}

exports.pushCode=pushCode;
exports.getOAuthURL=getOAuthURL;
exports.listFiles=listFiles;
exports.uploadDrive=uploadDrive;
exports.getUserInfo=getUserInfo;