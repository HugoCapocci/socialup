'use strict';
var google = require('googleapis');
var Q = require('q');
var fs = require("fs");

const GOOGLE_API_ID = process.env.GOOGLE_API_ID;
const GOOGLE_API_SECRET = process.env.GOOGLE_API_SECRET;
const GOOGLE_REDIRECT_URL = process.env.APP_URL + '/google2callback';

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(GOOGLE_API_ID, GOOGLE_API_SECRET, GOOGLE_REDIRECT_URL);
var youtubeAPI = google.youtube({ version: 'v3', auth: oauth2Client });
var drive = google.drive({ version: 'v2', auth: oauth2Client});

//generate url for OAuth authentication URI
function auth() {

    // generate a url that asks permissions for Google+ and Google Calendar scopes
    var scopes = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtubepartner',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.appdata',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
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

function sendVideo(tokens, file, fileData) {

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
    
    var buf = fs.readFileSync(file.path);
    if(buf === undefined) 
        deferred.reject(new Error('cannot load file from path: '+file.path));

    var  params = {
        part : Object.keys(metaData).join(','),
        media : {
            mimeType : file.mimetype,
            body : buf
        },
        resource : metaData
    };

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

function uploadDrive(tokens, file) {
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
    
    var buf = fs.readFileSync(file.path);
    if(buf === undefined) 
        deferred.reject(new Error('cannot load file from path: '+file.path));

    var  params = {
        part : Object.keys(metaData).join(','),
        media : {
            mimeType : file.mimetype,
            body : buf
        },
        resource : metaData
    };
    
    var videoUploadRequest = drive.files.insert(params, function() {
         //
    });
     videoUploadRequest.on('complete', function(response) {
        //console.log("video upload request complete with response: ", response);
        deferred.resolve(response);
    });
 
    videoUploadRequest.on('error', function(err) {
        //console.log("video upload request failed: ", err);
        deferred.reject(new Error(err));
    });
    return deferred.promise;
}

function checkDrive(tokens, folderId) {

    var deferred = Q.defer();
    if(folderId===undefined)
        folderId='root';

    oauth2Client.setCredentials(tokens);
    // drive.files.list({maxResults: 100}, function(err, response) {
    var filter = 'trashed=false';//'mimeType="application/vnd.google-apps.folder"'
    //list only folders
    drive.children.list({ folderId : folderId, q: filter }, function(err, response) {
        if (err) {
          console.log('The API returned an error: ' + err);
          deferred.reject(new Error(err));
          return;
        }
        //console.log('response: ', response);
        var files = response.items;
        if (files.length === 0) {
            console.log('No files found.');   
            deferred.resolve();
        } else {
            deferred.resolve(checkFilesData(files));
        }
    });
    return deferred.promise;
}

function checkFilesData(files) {
    var results = [];
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        results.push(checkFileData(file.id));  
    }
    return Q.all(results);
}

function checkFileData(fileId) {
    var deferred = Q.defer();
    drive.files.get({fileId:fileId}, function(err, file) {
        if(err) {
            console.log("cannot get data for fileId: ",fileId);
            deferred.reject(err);
        } else {
            //console.log('mimeType? ', file.mimeType);
            deferred.resolve({name:file.title, id: fileId, mimeType : file.mimeType});
        }
    });
    return deferred.promise;
}

exports.sendVideo=sendVideo;
exports.auth=auth;
exports.pushCode=pushCode;

exports.checkDrive=checkDrive;
exports.uploadDrive=uploadDrive;