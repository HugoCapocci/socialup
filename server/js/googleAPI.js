'use strict';

/**
* Google WEB API
* Youtube see https://developers.google.com/youtube/v3/
* GoogeDrive see https://developers.google.com/drive/web/about-sdk
* Google+ see https://developers.google.com/+/domains/getting-started

TODO check tokens.expiry_date and update user data in database if needed with refreshed tokens (automatically refresh by googleAPI)
*/

var googleAPI = require('googleapis');
var Q = require('q');
var fs = require("fs");

const GOOGLE_API_ID = process.env.GOOGLE_API_ID;
const GOOGLE_API_SECRET = process.env.GOOGLE_API_SECRET;
const GOOGLE_REDIRECT_URL = process.env.APP_URL + '/google2callback';

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

var OAuth2 = googleAPI.auth.OAuth2;
var oauth2Client = new OAuth2(GOOGLE_API_ID, GOOGLE_API_SECRET, GOOGLE_REDIRECT_URL);
var youtubeAPI = googleAPI.youtube({version: 'v3', auth: oauth2Client});
var drive = googleAPI.drive({version: 'v2', auth: oauth2Client});
var googlePlus = googleAPI.plus({version : 'v1', auth: oauth2Client});
/*var googlePlus = googleAPI.plusDomains({version : 'v1', auth: oauth2Client});*/

//generate url for OAuth authentication URI
function getOAuthURL() {

    // generate a url that asks permissions for Google+ and Google Calendar scopes
    var scopes = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtubepartner',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/plus.me',
        'https://www.googleapis.com/auth/plus.stream.write'
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

            oauth2Client.setCredentials(tokens);
            /*console.log("google refresh_tokens retrieved : ", tokens);
            //refresh token is set only first tie user use google oauth for this app
            var credentials = {
                access_token: tokens.access_token
            };
            if(tokens.refresh_token)
                credentials.refresh_token=tokens.refresh_token;
            oauth2Client.setCredentials(credentials);*/
            //console.log("credentials set !");
            deferred.resolve(tokens);
        } else {
            console.log("unable to set credentials, err: ", err);
            deferred.reject(err);
        }
    });    
    return deferred.promise;
}

function checkAccessTokenValidity(tokens, userId) {
  
   // console.log("tokens? ", tokens);  
    var deferred = Q.defer();
    if(tokens.expiry_date <= Date.now() ) {
        console.log("refresh google oauth token ");
        return refreshTokens(tokens, userId);
    } else {
        deferred.resolve(tokens);
        return deferred.promise;
    }
} 

function refreshTokens(tokens, userId) {
    
    var deferred = Q.defer();

    var credentials = {
      access_token: tokens.access_token
    };
    if(tokens.refresh_token)
        credentials.refresh_token=tokens.refresh_token;
    oauth2Client.setCredentials(credentials);

    oauth2Client.refreshAccessToken(function(err, tokens) {
    
         if(!err) {

            oauth2Client.setCredentials(tokens);
            console.log("google refreshed tokens retrieved : ", tokens);

            //refresh token is set only first tie user use google oauth for this app
/*            oauth2Client.setCredentials({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token
            });*/
            //console.log("credentials set !");
            deferred.resolve(tokens);
        } else {
            console.log("unable to set credentials, err: ", err);
            deferred.reject(new Error(err));
        }
        
    });
    return deferred.promise;
}

exports.listCategories = function(tokens) {
    
    oauth2Client.setCredentials(tokens);
    var deferred = Q.defer();
    youtubeAPI.videoCategories.list({part:'snippet', regionCode:'fr', hl:'fr_FR'}, function(err, response) {
       // console.log("listCategories response: ",response.items);
        //console.log("listCategories err: ",err);
        if(err)
            deferred.reject(err);
        else {
            
            var categories = [];
            response.items.forEach(function(item) {
                if(item.snippet.assignable)  
                    categories.push({
                        id : item.id,
                        name : item.snippet.title
                    });
            });
            deferred.resolve(categories);
        }
    });
        
    return deferred.promise;
};

//todo  categoryId ?
function sendVideo(tokens, file, user, videoParams, providerOptions) {

    console.log('youtube UploadFile, file? ',file);
    console.log('youtube UploadFile, providerOptions? ',providerOptions);
    var deferred = Q.defer();
    
    oauth2Client.setCredentials(tokens);
    
    var metaData = {
        snippet: {
            title: videoParams.title,
            description: videoParams.description,
            tags: videoParams.tags,
            categoryId: providerOptions.category.id
        },
        status: {
          privacyStatus: providerOptions.privacyStatus
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
        console.log("video uploaded on youtube on uri: ", videoUploadRequest.uri);
    });

    videoUploadRequest.on('complete', function(response) {
        console.log("video upload request complete with response.body: ", response.body);
       
        try {
            var body = JSON.parse(response.body);
            if(body.error)
                 deferred.reject(body.error);
            else
                deferred.resolve({
                    url : 'https://www.youtube.com/watch?v='+body.id,
                    thumbnail : body.snippet.thumbnails.high.url
                });
        } catch(err) {
            deferred.reject(err);
        }
    });
 
    videoUploadRequest.on('error', function(err) {
        //console.log("video upload request failed: ", err);
        deferred.reject(new Error(err));
    });

    //on data -> TODO
    return deferred.promise;
}

function uploadDrive(tokens, file, parent) {
    var deferred = Q.defer();
    
    console.log("upload to parent? ",parent);
    
    oauth2Client.setCredentials(tokens);

    var metaData = {
        uploadType : 'media', 
        visibility: 'PRIVATE',
        title : file.originalname
    };
    if(parent!==undefined)
        metaData.parents = [{id:parent}];
    
    var buf = fs.readFileSync(file.path);
    if(buf === undefined) 
        deferred.reject(new Error('cannot load file from path: '+file.path));

    var params = {
        part : Object.keys(metaData).join(','),
        media : {
            mimeType : file.mimetype,
            body : buf,
            title : file.originalname
        },
        resource : metaData
    };

    var videoUploadRequest = drive.files.insert(params, function() {
         //
    });
    videoUploadRequest.on('complete', function(response) {
        var result = JSON.parse(response.body);
        console.log("google drive file upload request complete with result: ", result);
        deferred.resolve({
            url : 'https://drive.google.com/file/d/'+result.id+'/view',
            downloadUrl : result.downloadUrl
        });
    });
 
    videoUploadRequest.on('error', function(err) {
        console.log("video upload request failed: ", err);
        deferred.reject(new Error(err));
    });
    return deferred.promise;
}

function listFiles(tokens, folderId, typeFilter) {

    var deferred = Q.defer();
    var filter = 'trashed=false';
    
    console.log("folderId? ", folderId);
    
    if(folderId===undefined) 
        folderId='root';
    
    filter+=' and "'+folderId+'" in parents';
    
    //image or video
    if(typeFilter !== undefined) {
        if(typeFilter==='folder')
            filter+=' and mimeType="application/vnd.google-apps.folder" ';
        else
            filter+=' and (mimeType="application/vnd.google-apps.folder" or mimeType contains "'+typeFilter+'/") ';
    }
    
    console.log("filter ? ", filter);

    oauth2Client.setCredentials(tokens);
    // drive.files.list({maxResults: 100}, function(err, response) {
   //'mimeType="application/vnd.google-apps.folder"'
    //list only folders
    //drive.children.list({ folderId : folderId, q: filter }, function(err, response) {
    drive.files.list({ folderId : folderId, q: filter}, function(err, response) {
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
            console.log('Files found: ', files.length);
            deferred.resolve(files.map(function(file) {
                //console.log("file :", file);
                var fileInfo = {
                    name:file.title, 
                    id: file.id, 
                    mimeType : file.mimeType, 
                    isFolder : file.mimeType === FOLDER_MIME_TYPE
                };
                if(file.downloadUrl)
                    fileInfo.downloadUrl = file.downloadUrl.replace('&gd=true','');
                return fileInfo;
           }));
        }
    });
    return deferred.promise;
}

function getUserInfo(tokens) {
    //id=103809399192041774467
    oauth2Client.setCredentials(tokens);
    var deferred = Q.defer();
    googlePlus.people.get({userId:'me'}, function(err, response) {
        
        if (err) {
            console.log('getUserInfo error: ', err);
            deferred.reject(new Error(err));
        } else {
            //console.log('getUserInfo response: ', response);
            deferred.resolve({userName : response.displayName});
        }
        
    });
    return deferred.promise;
}

exports.downloadFile = function(tokens,fileId) {
    
    var deferred = Q.defer();
    oauth2Client.setCredentials(tokens);
    drive.files.get({fileId:fileId+'?alt=media'}, function(err, bytes) {
        if(err) {
            console.log("cannot get data for fileId: "+fileId+" error: ", err);
            deferred.reject(err);
        } else {
            deferred.resolve(bytes);
        }
    });
    return deferred.promise;
};

exports.checkFileData = function(tokens, fileId) {
    var deferred = Q.defer();
    drive.files.get({fileId:fileId}, function(err, file) {
        if(err) {
            console.log("cannot get data for fileId: "+fileId+" error: ", err);
            deferred.reject(err);
        } else {
            console.log('fileInfo? ', file);
            var fileInfo = {
                name:file.title, 
                id: fileId, 
                mimeType : file.mimeType, 
                isFolder : file.mimeType === FOLDER_MIME_TYPE
            };
            if(file.downloadUrl)
                fileInfo.downloadUrl = file.downloadUrl.replace('&gd=true','');
            deferred.resolve(fileInfo);
        }
    });
    return deferred.promise;
};

exports.sendVideo=sendVideo;
exports.getOAuthURL=getOAuthURL;
exports.pushCode=pushCode;
exports.listFiles=listFiles;
exports.uploadDrive=uploadDrive;
exports.getUserInfo=getUserInfo;
exports.refreshTokens=refreshTokens;