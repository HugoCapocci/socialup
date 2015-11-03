'use strict';
var google = require('googleapis');
var Q = require('q');

const GOOGLE_API_ID = process.env.GOOGLE_API_ID;
const GOOGLE_API_SECRET = process.env.GOOGLE_API_SECRET;
const GOOGLE_REDIRECT_URL = process.env.APP_URL + '/google2callback';
//const REDIRECT_URL = 'https://oauth.io/auth';

var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(GOOGLE_API_ID, GOOGLE_API_SECRET, GOOGLE_REDIRECT_URL);
var youtubeAPI = google.youtube({ version: 'v3', auth: oauth2Client });

//generate url for OAuth authentication URI
function auth() {

    // generate a url that asks permissions for Google+ and Google Calendar scopes
    var scopes = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtubepartner',
        'https://www.googleapis.com/auth/youtube.force-ssl'
    ];
    var url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
      scope: scopes // If you only need one scope you can pass it as string
    });
    return url;
}

function pushCode(code) {
    
    var deferred = Q.defer();
    //ask for token
    oauth2Client.getToken(code, function(err, tokens) {
        // Now tokens contains an access_token and an optional refresh_token. Save them.
        if(!err) {
            //console.log("credentials set !");
            deferred.resolve(tokens);
        } else {
            console.log("unable to set credentials, err: ", err);
            deferred.reject(new Error(err));
        }
    });    
    return deferred.promise;
}

function uploadFile(tokens, file) {
    
    console.log('youtube UploadFile, file? ',file);

    var deferred = Q.defer();
    
    oauth2Client.setCredentials(tokens);
    
    var metaData = {
        snippet: {
            title: 'test',
            description: 'test',
            tags: ['WTC', 'popopo'],
            categoryId: '22'
        },
        status: {
          privacyStatus: 'private'
        }
    };
    
    var params;
    if(file === undefined) {
        var fs = require("fs");
        var filename = "server/test/uploadFile.mp4";
        var buf = fs.readFileSync(filename);
        params = {
            part : Object.keys(metaData).join(','),
            media : {
                mimeType :'video/x-flv',
                body : buf
            },
            resource : metaData
        };
    } else {
        var fs = require("fs");
        var buf = fs.readFileSync(file.path);
        if(buf === undefined) 
            deferred.reject(new Error('cannot load file from path'));
        
        params = {
            part : Object.keys(metaData).join(','),
            media : {
                mimeType : file.mimetype,
                body : buf
            },
            resource : metaData
        };
    }

    // https://developers.google.com/youtube/v3/docs/videos/insert
    var videoUploadRequest = youtubeAPI.videos.insert(params, function() {
       // console.log("video uploaded on youtube on uri: ", videoUploadRequest.uri);
    });

    videoUploadRequest.on('complete', function(response) {
        //console.log("video upload request complete with response: ", response);
        deferred.resolve(response);
    });
 
    videoUploadRequest.on('error', function(err) {
        //console.log("video upload request failed: ", err);
        deferred.reject(new Error(err));
    });

    //on data -> TODO
    return deferred.promise;
}

exports.uploadFile=uploadFile;
exports.auth=auth;
exports.pushCode=pushCode;