'use strict';

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

function listFolder(token, path) {
    
    var deferred = Q.defer();
    if(path===undefined || path ==='root')
        path='';
    else 
        path = decodeURI(path);
 
    var post_data = {
        path: path,
        recursive: false,
        include_media_info: false
    };
    
    console.log("path? ", path);

    request({
        uri: 'https://'+END_POINT+'/2/files/list_folder',
        auth: {
            bearer: token.access_token
        },
        method: "POST",
        json: true,
        body: post_data
    }, function (error, response, body){
        //console.log(response);
        if(error)
            deferred.reject(new Error(error));
        else {
           // console.log("data? ", body.entries);
            var results = [];
            if(body.entries)
                for( var i=0; i<body.entries.length; i++) {
                   var entry = body.entries[i];
                  // console.log('add entry: ', entry);
                   results.push({
                       name : entry.name, id: entry.path_lower, mimeType : entry['.tag'], isFolder : entry['.tag'] === 'folder'
                   });
                }
            deferred.resolve(results);
        }
    });
    return deferred.promise;
}

function getOAuthURL() {

    //add require_role    
    return 'https://www.dropbox.com/1/oauth2/authorize?client_id='+DROPBOX_APP_KEY+'&redirect_uri='+DROPBOX_REDIRECT_URI+'&response_type=code';
}

exports.pushCode=pushCode;
exports.getOAuthURL=getOAuthURL;
exports.listFolder=listFolder;