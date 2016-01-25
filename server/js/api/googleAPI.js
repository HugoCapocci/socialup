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
var userDAO = require('../userDAO.js');
var moment = require('moment');

const GOOGLE_API_ID = process.env.GOOGLE_API_ID;
const GOOGLE_API_SECRET = process.env.GOOGLE_API_SECRET;
const GOOGLE_REDIRECT_URL = process.env.APP_URL + '/google2callback';
const API_KEY = process.env.GOOGLE_API_KEY;
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

var OAuth2 = googleAPI.auth.OAuth2;
var oauth2Client = new OAuth2(GOOGLE_API_ID, GOOGLE_API_SECRET, GOOGLE_REDIRECT_URL);
var youtubeAPI = googleAPI.youtube({version: 'v3', auth: oauth2Client});
var drive = googleAPI.drive({version: 'v2', auth: oauth2Client});
var googlePlus = googleAPI.plus({version : 'v1', auth: oauth2Client});

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
            //TODO update in database
            userDAO.updateUserTokens(userId, 'google', tokens);
            deferred.resolve(tokens);
        } else {
            console.log("unable to set credentials, err: ", err);
            deferred.reject(err);
        }
    });
    return deferred.promise;
}

exports.listCategories = function(tokens) {
    
    oauth2Client.setCredentials(tokens);
    var deferred = Q.defer();
    youtubeAPI.videoCategories.list({part:'snippet', regionCode:'fr', hl:'fr_FR'}, function(err, response) {

        if(err)
            deferred.reject(err);
        else {
            var categories = [];
            response.items.forEach(function(item) {
                //console.log("google cat", item);
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

// see https://developers.google.com/youtube/v3/docs/search/list#forMine
exports.listMedia = function(tokens, userId) {
    
    oauth2Client.setCredentials(tokens);
    var deferred = Q.defer();

    var videoIDs = [];   
    //youtubeAPI.videos.list({part:'snippet', regionCode:'fr', hl:'fr_FR', chart : 'mostPopular'}
    youtubeAPI.search.list({part:'snippet', forMine : true, type : 'video'}, function(err, response) {

        if(err)
            deferred.reject(err);
        else {
            var videos = [];
            var counts={
                view:0,
                like:0,
                dislike:0,
                favorite:0,
                comment:0
            };
            var getStat = function(name) {
                return { name : name, value : counts[name]};
            };
            response.items.forEach(function(item) {
                //console.log('youtube item: ', item);
                videoIDs.push(item.id.videoId);
                videos.push({
                    id : item.id.videoId,
                    creationDate : item.snippet.publishedAt,
                    title : item.snippet.title,
                    description : item.snippet.description,
                    thumbnailURL : item.snippet.thumbnails['default'].url
                });
            });
            youtubeAPI.videos.list({part:'statistics', id : videoIDs.toString()}, function(e, res) {
                //console.log("videos.list ",res);
                var i=0;
                res.items.forEach(function(item) {
                    //console.log("videos.list item ",item);
                    //console.log("videos[i].id === item.id ? ", videos[i].id === item.id);
                    videos[i].counts = item.statistics;
                    counts.view += parseInt(item.statistics.viewCount);
                    counts.like += parseInt(item.statistics.likeCount);
                    counts.dislike += parseInt(item.statistics.dislikeCount);
                    counts.favorite += parseInt(item.statistics.favoriteCount);
                    counts.comment += parseInt(item.statistics.commentCount);
                    i++;
                });
                
                deferred.resolve({
                    list : videos,
                    stats : [
                        getStat('view'),
                        getStat('like'),
                        getStat('dislike'),
                        getStat('favorite'),
                        getStat('comment')
                    ]
                });
                
            });
        }
    });
    return deferred.promise;
};

//page === channel for youtube
exports.searchPage = function(tokens, channelName) {
    
    var deferred = Q.defer();
    
    var query = {
        auth : API_KEY, 
        part :'snippet', 
        q : channelName, 
        type : 'channel',
        safeSearch : 'none'
    };
    
    youtubeAPI.search.list(query, function(err, response) {
        //console.log("searchPage, err? ", err);
        if(err)
            deferred.reject(err);
        else {
            //var channelIds = [];
            var channels = {};
            response.items.forEach(function(item) {
                //console.log("youtube channel: ", item);
                //channelIds.push(item.id.channelId);
                channels[item.id.channelId] = {
                    id : item.id.channelId,
                    creationDate : item.snippet.publishedAt,
                    name : item.snippet.channelTitle,
                    displayName : item.snippet.title,
                    description : item.snippet.description,
                    thumbnailURL : item.snippet.thumbnails['default'].url
                };
            });
            youtubeAPI.channels.list({auth: API_KEY, part:'statistics', id : Object.keys(channels).toString()}, function(err, res) {     
                
                if(res)
                    res.items.forEach(function(item) {
                        //console.log("youtube channel details: ", item);
                        channels[item.id].counts = {
                            view : parseInt(item.statistics.viewCount),
                            subscriber : parseInt(item.statistics.subscriberCount),
                            video : parseInt(item.statistics.videoCount),
                            comment : parseInt(item.statistics.commentCount)
                        };
                    });
                deferred.resolve(Object.keys(channels).map(function(id) {
                    return channels[id];
                }));
            });
            
        }
    });
    return deferred.promise;
};

// see https://developers.google.com/youtube/v3/docs/search/list#
exports.searchVideo = function(videoName, maxResults, order, pageToken) {

    var deferred = Q.defer();
    var videos = {};
    var channelIDs = [];
    var query = {
        auth : API_KEY, 
        part :'snippet', 
        q : videoName, 
        type : 'video', 
        maxResults : maxResults,
        safeSearch : 'none'
    };
    if(order)
        query.order=order;
    if(pageToken)
        query.pageToken=pageToken;
    
    var totalResults, nextPageToken, prevPageToken;    
    youtubeAPI.search.list(query, function(err, response) {
        //console.log("searchVideo, err? ", err);
        if(err)
            deferred.reject(err);
        else {
            //console.log("searchVideo, response? ", response);            
            totalResults = response.pageInfo.totalResults;
            nextPageToken = response.nextPageToken;
            prevPageToken = response.prevPageToken;
            var videos = [];
            response.items.forEach(function(item) {
                //console.log('youtube item: ', item);
               // videoIDs.push(item.id.videoId);
                videos[item.id.videoId] = {
                    id : item.id.videoId,
                    // retrieve channel data, not user
                    channelId : item.snippet.channelId,
                    channelURL : 'https://www.youtube.com/channel/'+item.snippet.channelId,
                    creationDate : item.snippet.publishedAt,
                    title : item.snippet.title,
                    description : item.snippet.description,
                    thumbnailURL : item.snippet.thumbnails['default'].url
                };
                if(channelIDs.indexOf(item.snippet.channelId)===-1)
                    channelIDs.push(item.snippet.channelId);
            });
            //TODO use tokens if user is connected
            youtubeAPI.videos.list({auth: API_KEY, part:'statistics,contentDetails', id : Object.keys(videos).toString()}, function(err, res) {

                if(err) {
                    console.error(err);
                    deferred.reject(err);
                } else {
                    //console.log("videos.list ",res);
                  
                    if(res)
                        res.items.forEach(function(item) {
                            //youtube duration format -> https://en.wikipedia.org/wiki/ISO_8601#Durations
                            videos[item.id].duration = moment.duration(item.contentDetails.duration).asSeconds();
                            videos[item.id].counts = {
                                view : parseInt(item.statistics.viewCount),
                                like : parseInt(item.statistics.likeCount),
                                dislike : parseInt(item.statistics.dislikeCount),
                                favorite : parseInt(item.statistics.favoriteCount),
                                comment : parseInt(item.statistics.commentCount)
                            }; 
                        });
                    
                    youtubeAPI.channels.list({auth: API_KEY, part:'snippet', id : channelIDs.toString()} , function(err, channelsResult) { 
                        
                        if(err) {
                            console.error(err);
                            deferred.reject(err);
                        } else {                            
                            var channels = {};
                            channelsResult.items.forEach(function(channel) {
                                //console.log("Channel  ", channel);
                                channels[channel.id]=channel.snippet.title;
                            });
                            
                            var videoArray = Object.keys(videos).map(function(id) {
                                videos[id].channel = channels[videos[id].channelId];
                                delete videos[id].channelId;
                                return videos[id];
                            });    
                            deferred.resolve({
                                videos : videoArray,
                                totalResults :  totalResults,
                                nextPageToken : nextPageToken,
                                prevPageToken : prevPageToken
                            });
                        }
                    
                    });
                }
            });
        }
    });
    return deferred.promise;
};

//todo  categoryId ?
function sendVideo(tokens, file, user, videoParams, providerOptions) {

    //console.log('youtube UploadFile, file? ',file);
    //console.log('youtube UploadFile, providerOptions? ',providerOptions);
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
        //console.log("video uploaded on youtube on uri: ", videoUploadRequest.uri);
    });
    videoUploadRequest.on('complete', function(response) {
        //console.log("video upload request complete with response.body: ", response.body);
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
    //console.log("upload to parent? ",parent);
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
        var result;
        try {
            result = JSON.parse(response.body);
            //console.log("google drive file upload request complete with result: ", result);
            deferred.resolve({
                url : 'https://drive.google.com/file/d/'+result.id+'/view',
                downloadUrl : result.downloadUrl
            });
        } catch(err) {
            deferred.reject(err);
        }
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
    
    //console.log("folderId? ", folderId);
    
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
    
    //console.log("filter ? ", filter);

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
            //console.log('No files found.');   
            deferred.resolve();
        } else {
            //console.log('Files found: ', files.length);
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
    
    //var deferred = Q.defer();
    oauth2Client.setCredentials(tokens);
    return drive.files.get({fileId:fileId+'?alt=media'}, function(err/*, bytes*/) {
        if(err) {
            console.log("cannot get data for fileId: "+fileId+" error: ", err);
          //  deferred.reject(err);
        } /*else {
            deferred.resolve(bytes);
        }*/
    });
   // return deferred.promise;
};

exports.checkFileData = function(tokens, fileId) {
    var deferred = Q.defer();
    drive.files.get({fileId:fileId}, function(err, file) {
        if(err) {
            console.log("cannot get data for fileId: "+fileId+" error: ", err);
            deferred.reject(err);
        } else {
            //console.log('fileInfo? ', file);
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

exports.getSpaceUsage = function(tokens) {
    
    oauth2Client.setCredentials(tokens);
    var deferred = Q.defer();
    drive.about.get(function(err, infos) {
        if(err) {
            console.log("cannot get googleDrive SpaceUsage, error: ", err);
            deferred.reject(err);
        } else {
            //console.log('SpaceUsage infos? ', infos);           
            deferred.resolve({
                used : parseInt(infos.quotaBytesUsedAggregate), //infos.quotaBytesUsed+infos.quotaBytesUsedInTrash
                total : parseInt(infos.quotaBytesTotal)
            });
        }
    });
    return deferred.promise;
};

exports.createShareLink = function(tokens, fileId) {
    
    
    // drive.permissions.insert
    
     /*params - Parameters for request
     * @param  {string=} params.emailMessage - A custom message to include in notification emails.
     * @param  {string} params.fileId - The ID for the file.
     * @param  {boolean=} params.sendNotificationEmails - Whether to send notification emails when sharing to users or groups. This parameter is ignored and an email is sent if the role is owner.
     * @param  {object} params.resource - Request body data*/
    
    oauth2Client.setCredentials(tokens);
    var deferred = Q.defer();
    var permission = {
        type : 'anyone',
        id : 'anyone',
        name :'anyone',
        role : 'reader',
        withLink : true
    };
    
    drive.permissions.insert({fileId:fileId, resource : permission}, function(err, results) {
         if(err) {
            console.log("cannot change file permission ", err);
            deferred.reject(err);
        } else {
            //console.log('SpaceUsage infos? ', infos);           
            deferred.resolve(results);
        }
    });
    return deferred.promise;
};

exports.deleteFile = function(tokens, fileId) {
 
    oauth2Client.setCredentials(tokens);
    var deferred = Q.defer();
    drive.files.delete({fileId:fileId}, function(err, res) {
        if(err) {
            console.log("cannot delete file ", err);
            deferred.reject(err);
        } else {         
            deferred.resolve(res);
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