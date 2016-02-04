
/*
 * Google WEB API
 * Youtube see https://developers.google.com/youtube/v3/
 * GoogeDrive see https://developers.google.com/drive/web/about-sdk
 * Google+ see https://developers.google.com/+/domains/getting-started
 *
 * TODO check tokens.expiry_date and update user data in database
 * if needed with refreshed tokens (automatically refresh by googleAPI)
 */
var API_KEY, FOLDER_MIME_TYPE, GOOGLE_API_ID, GOOGLE_API_SECRET, GOOGLE_REDIRECT_URL, OAuth2, Q, calendar, drive, fs, googleAPI, googlePlus, moment, oauth2Client, userDAO, youtubeAPI;

googleAPI = require('googleapis');

Q = require('q');

fs = require("fs");

userDAO = require('../userDAO.js');

moment = require('moment');

GOOGLE_API_ID = process.env.GOOGLE_API_ID;

GOOGLE_API_SECRET = process.env.GOOGLE_API_SECRET;

GOOGLE_REDIRECT_URL = process.env.APP_URL + '/google2callback';

API_KEY = process.env.GOOGLE_API_KEY;

FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

OAuth2 = googleAPI.auth.OAuth2;

oauth2Client = new OAuth2(GOOGLE_API_ID, GOOGLE_API_SECRET, GOOGLE_REDIRECT_URL);

youtubeAPI = googleAPI.youtube({
  version: 'v3',
  auth: oauth2Client
});

drive = googleAPI.drive({
  version: 'v2',
  auth: oauth2Client
});

googlePlus = googleAPI.plus({
  version: 'v1',
  auth: oauth2Client
});

calendar = googleAPI.calendar({
  version: 'v3',
  auth: oauth2Client
});

exports.getOAuthURL = function() {
  var scopes, url;
  scopes = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtubepartner', 'https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/plus.stream.write', 'https://www.googleapis.com/auth/calendar'];
  return url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });
};

exports.pushCode = function(code) {
  var deferred;
  deferred = Q.defer();
  oauth2Client.getToken(code, function(err, tokens) {
    if (!err) {
      oauth2Client.setCredentials(tokens);
      return deferred.resolve(tokens);
    } else {
      console.log("unable to set credentials, err: ", err);
      return deferred.reject(err);
    }
  });
  return deferred.promise;
};

exports.refreshTokens = function(tokens, userId) {
  var credentials, deferred;
  deferred = Q.defer();
  credentials = {
    access_token: tokens.access_token
  };
  if (tokens.refresh_token) {
    credentials.refresh_token = tokens.refresh_token;
  }
  oauth2Client.setCredentials(credentials);
  oauth2Client.refreshAccessToken(function(err, tokens) {
    if (!err) {
      oauth2Client.setCredentials(tokens);
      deferred.resolve(tokens);
    } else {

    }
    console.log("unable to set credentials, err: ", err);
    return deferred.reject(err);
  });
  return deferred.promise;
};

exports.listCategories = function(tokens) {
  var deferred;
  oauth2Client.setCredentials(tokens);
  deferred = Q.defer();
  youtubeAPI.videoCategories.list({
    part: 'snippet',
    regionCode: 'fr',
    hl: 'fr_FR'
  }, function(err, response) {
    var categories, item, j, len, ref;
    if (err) {
      return deferred.reject(err);
    } else {
      categories = [];
      ref = response.items;
      for (j = 0, len = ref.length; j < len; j++) {
        item = ref[j];
        if (item.snippet.assignable) {
          categories.push({
            id: item.id,
            name: item.snippet.title
          });
        }
      }
      return deferred.resolve(categories);
    }
  });
  return deferred.promise;
};

exports.listMedia = function(tokens, userId) {
  var deferred, videoIDs;
  oauth2Client.setCredentials(tokens);
  deferred = Q.defer();
  videoIDs = [];
  youtubeAPI.search.list({
    part: 'snippet',
    forMine: true,
    type: 'video'
  }, function(err, response) {
    var counts, getStat, item, j, len, ref, videos;
    if (err) {
      return deferred.reject(err);
    } else {
      videos = [];
      counts = {
        view: 0,
        like: 0,
        dislike: 0,
        favorite: 0,
        comment: 0
      };
      getStat = function(name) {
        return {
          name: name,
          value: counts[name]
        };
      };
      ref = response.items;
      for (j = 0, len = ref.length; j < len; j++) {
        item = ref[j];
        videoIDs.push(item.id.videoId);
        videos.push({
          id: item.id.videoId,
          creationDate: item.snippet.publishedAt,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnailURL: item.snippet.thumbnails['default'].url
        });
      }
      return youtubeAPI.videos.list({
        part: 'statistics',
        id: videoIDs.toString()
      }, function(e, res) {
        var i, k, len1, ref1;
        i = 0;
        ref1 = res.items;
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          item = ref1[k];
          videos[i].counts = item.statistics;
          counts.view += parseInt(item.statistics.viewCount);
          counts.like += parseInt(item.statistics.likeCount);
          counts.dislike += parseInt(item.statistics.dislikeCount);
          counts.favorite += parseInt(item.statistics.favoriteCount);
          counts.comment += parseInt(item.statistics.commentCount);
          i++;
        }
        return deferred.resolve({
          list: videos,
          stats: [getStat('view'), getStat('like'), getStat('dislike'), getStat('favorite'), getStat('comment')]
        });
      });
    }
  });
  return deferred.promise;
};

exports.searchPage = function(tokens, channelName) {
  var deferred, query;
  deferred = Q.defer();
  query = {
    auth: API_KEY,
    part: 'snippet',
    q: channelName,
    type: 'channel',
    safeSearch: 'none'
  };
  youtubeAPI.search.list(query, function(err, response) {
    var channels, item, j, len, ref;
    if (err) {
      return deferred.reject(err);
    } else {
      channels = {};
      ref = reponse.items;
      for (j = 0, len = ref.length; j < len; j++) {
        item = ref[j];
        channels[item.id.channelId] = {
          id: item.id.channelId,
          creationDate: item.snippet.publishedAt,
          name: item.snippet.channelTitle,
          displayName: item.snippet.title,
          description: item.snippet.description,
          thumbnailURL: item.snippet.thumbnails['default'].url
        };
      }
      return youtubeAPI.channels.list({
        auth: API_KEY,
        part: 'statistics',
        id: Object.keys(channels).toString()
      }, function(err, res) {
        var k, len1, ref1;
        if (res) {
          ref1 = res.items;
          for (k = 0, len1 = ref1.length; k < len1; k++) {
            item = ref1[k];
            channels[item.id].counts = {
              view: parseInt(item.statistics.viewCount),
              subscriber: parseInt(item.statistics.subscriberCount),
              video: parseInt(item.statistics.videoCount),
              comment: parseInt(item.statistics.commentCount)
            };
          }
        }
        return deferred.resolve(Object.keys(channels).map(function(id) {
          return channels[id];
        }));
      });
    }
  });
  return deferred.promise;
};

exports.searchVideo = function(videoName, maxResults, order, pageToken) {
  var channelIDs, deferred, nextPageToken, prevPageToken, query, totalResults, videos;
  deferred = Q.defer();
  videos = {};
  channelIDs = [];
  query = {
    auth: API_KEY,
    part: 'snippet',
    q: videoName,
    type: 'video',
    maxResults: maxResults,
    safeSearch: 'none'
  };
  if (order) {
    query.order = order;
  }
  if (pageToken) {
    query.pageToken = pageToken;
  }
  totalResults = null;
  nextPageToken = null;
  prevPageToken = null;
  youtubeAPI.search.list(query, function(err, response) {
    var item, j, len, ref;
    if (err) {
      deferred.reject(err);
    } else {
      totalResults = response.pageInfo.totalResults;
      nextPageToken = response.nextPageToken;
      prevPageToken = response.prevPageToken;
      videos = [];
      ref = response.items;
      for (j = 0, len = ref.length; j < len; j++) {
        item = ref[j];
        videos[item.id.videoId] = {
          id: item.id.videoId,
          channelId: item.snippet.channelId,
          channelURL: 'https://www.youtube.com/channel/' + item.snippet.channelId,
          creationDate: item.snippet.publishedAt,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnailURL: item.snippet.thumbnails['default'].url
        };
        if (channelIDs.indexOf(item.snippet.channelId) === -1) {
          channelIDs.push(item.snippet.channelId);
        }
      }
    }
    return youtubeAPI.videos.list({
      auth: API_KEY,
      part: 'statistics,contentDetails',
      id: Object.keys(videos).toString()
    }, function(err, res) {
      var k, len1, ref1;
      if (err) {
        console.error(err);
        return deferred.reject(err);
      } else {
        if (res) {
          ref1 = res.items;
          for (k = 0, len1 = ref1.length; k < len1; k++) {
            item = ref1[k];
            videos[item.id].duration = moment.duration(item.contentDetails.duration).asSeconds();
            videos[item.id].counts = {
              view: parseInt(item.statistics.viewCount),
              like: parseInt(item.statistics.likeCount),
              dislike: parseInt(item.statistics.dislikeCount),
              favorite: parseInt(item.statistics.favoriteCount),
              comment: parseInt(item.statistics.commentCount)
            };
          }
        }
        return youtubeAPI.channels.list({
          auth: API_KEY,
          part: 'snippet',
          id: channelIDs.toString()
        }, function(err, channelsResult) {
          var channel, channels, l, len2, ref2, videoArray;
          if (err) {
            console.error(err);
            deferred.reject(err);
          } else {
            channels = {};
            ref2 = channelsResult.items;
            for (l = 0, len2 = ref2.length; l < len2; l++) {
              channel = ref2[l];
              channels[channel.id] = channel.snippet.title;
            }
            videoArray = Object.keys(videos).map(function(id) {
              videos[id].channel = channels[videos[id].channelId];
              delete videos[id].channelId;
              return videos[id];
            });
          }
          return deferred.resolve({
            videos: videoArray,
            totalResults: totalResults,
            nextPageToken: nextPageToken,
            prevPageToken: prevPageToken
          });
        });
      }
    });
  });
  return deferred.promise;
};

exports.sendVideo = function(tokens, file, user, videoParams, providerOptions) {
  var buf, deferred, metaData, params, videoUploadRequest;
  deferred = Q.defer();
  oauth2Client.setCredentials(tokens);
  metaData = {
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
  buf = fs.readFileSync(file.path);
  if (buf === void 0) {
    deferred.reject(new Error('cannot load file from path: ' + file.path));
  }
  params = {
    part: Object.keys(metaData).join(','),
    media: {
      mimeType: file.mimetype,
      body: buf
    },
    resource: metaData
  };
  videoUploadRequest = youtubeAPI.videos.insert(params);
  videoUploadRequest.on('complete', function(response) {
    var body, error1;
    try {
      body = JSON.parse(response.body);
      if (body.error) {
        return deferred.reject(body.error);
      } else {
        return deferred.resolve({
          url: 'https://www.youtube.com/watch?v=' + body.id,
          thumbnail: body.snippet.thumbnails.high.url
        });
      }
    } catch (error1) {
      return deferred.reject(error);
    }
  });
  videoUploadRequest.on('error', function(err) {
    return deferred.reject(new Error(err));
  });
  return deferred.promise;
};

exports.uploadDrive = function(tokens, file, parent) {
  var buf, deferred, metaData, params, videoUploadRequest;
  deferred = Q.defer();
  oauth2Client.setCredentials(tokens);
  metaData = {
    uploadType: 'media',
    visibility: 'PRIVATE',
    title: file.originalname
  };
  if (parent !== void 0) {
    metaData.parents = [
      {
        id: parent
      }
    ];
  }
  buf = fs.readFileSync(file.path);
  if (buf === void 0) {
    deferred.reject(new Error('cannot load file from path: ' + file.path));
  }
  params = {
    part: Object.keys(metaData).join(','),
    media: {
      mimeType: file.mimetype,
      body: buf,
      title: file.originalname
    },
    resource: metaData
  };
  videoUploadRequest = drive.files.insert(params);
  videoUploadRequest.on('complete', function(response) {
    result;
    var error1, result;
    try {
      result = JSON.parse(response.body);
      return deferred.resolve({
        url: 'https://drive.google.com/file/d/' + result.id + '/view',
        downloadUrl: result.downloadUrl
      });
    } catch (error1) {
      return deferred.reject(error);
    }
  });
  videoUploadRequest.on('error', function(err) {
    console.log("video upload request failed: ", err);
    return deferred.reject(new Error(err));
  });
  return deferred.promise;
};

exports.listFiles = function(tokens, folderId, typeFilter) {
  var deferred, filter;
  deferred = Q.defer();
  filter = 'trashed=false';
  if (folderId === void 0) {
    folderId = 'root';
  }
  filter += ' and "' + folderId + '" in parents';
  if (typeFilter !== void 0) {
    if (typeFilter === 'folder') {
      filter += ' and mimeType="application/vnd.google-apps.folder" ';
    } else {
      filter += ' and (mimeType="application/vnd.google-apps.folder" or mimeType contains "' + typeFilter + '/") ';
    }
  }
  oauth2Client.setCredentials(tokens);
  drive.files.list({
    folderId: folderId,
    q: filter
  }, function(err, response) {
    var files;
    if (err) {
      console.log('The API returned an error: ' + err);
      deferred.reject(new Error(err));
      return;
    }
    files = response.items;
    if (files.length === 0) {
      return deferred.resolve();
    } else {
      return deferred.resolve(files.map(function(file) {
        var fileInfo;
        fileInfo = {
          name: file.title,
          id: file.id,
          mimeType: file.mimeType,
          isFolder: file.mimeType === FOLDER_MIME_TYPE
        };
        if (file.downloadUrl) {
          fileInfo.downloadUrl = file.downloadUrl.replace('&gd=true', '');
        }
        return fileInfo;
      }));
    }
  });
  return deferred.promise;
};

exports.getUserInfo = function(tokens) {
  var deferred;
  oauth2Client.setCredentials(tokens);
  deferred = Q.defer();
  googlePlus.people.get({
    userId: 'me'
  }, function(err, response) {
    if (err) {
      console.log('getUserInfo error: ', err);
      return deferred.reject(new Error(err));
    } else {
      return deferred.resolve({
        userName: response.displayName
      });
    }
  });
  return deferred.promise;
};

exports.downloadFile = function(tokens, fileId) {
  oauth2Client.setCredentials(tokens);
  return drive.files.get({
    fileId: fileId + '?alt=media'
  }, function(err) {
    if (err) {
      return console.log("cannot get data for fileId: " + fileId + " error: ", err);
    }
  });
};

exports.checkFileData = function(tokens, fileId) {
  var deferred;
  deferred = Q.defer();
  drive.files.get({
    fileId: fileId
  }, function(err, file) {
    var fileInfo;
    if (err) {
      console.log("cannot get data for fileId: " + fileId + " error: ", err);
      return deferred.reject(err);
    } else {
      fileInfo = {
        name: file.title,
        id: fileId,
        mimeType: file.mimeType,
        isFolder: file.mimeType === FOLDER_MIME_TYPE
      };
      if (file.downloadUrl) {
        fileInfo.downloadUrl = file.downloadUrl.replace('&gd=true', '');
      }
      return deferred.resolve(fileInfo);
    }
  });
  return deferred.promise;
};

exports.getSpaceUsage = function(tokens) {
  var deferred;
  oauth2Client.setCredentials(tokens);
  deferred = Q.defer();
  drive.about.get(function(err, infos) {
    if (err) {
      console.log("cannot get googleDrive SpaceUsage, error: ", err);
      return deferred.reject(err);
    } else {
      return deferred.resolve({
        used: parseInt(infos.quotaBytesUsedAggregate),
        total: parseInt(infos.quotaBytesTotal)
      });
    }
  });
  return deferred.promise;
};

exports.createShareLink = function(tokens, fileId) {
  var deferred, permission;
  oauth2Client.setCredentials(tokens);
  deferred = Q.defer();
  permission = {
    type: 'anyone',
    id: 'anyone',
    name: 'anyone',
    role: 'reader',
    withLink: true
  };
  drive.permissions.insert({
    fileId: fileId,
    resource: permission
  }, function(err, results) {
    if (err) {
      console.log("cannot change file permission ", err);
      return deferred.reject(err);
    } else {
      return deferred.resolve(results);
    }
  });
  return deferred.promise;
};

exports.deleteFile = function(tokens, fileId) {
  var deferred;
  oauth2Client.setCredentials(tokens);
  deferred = Q.defer();
  drive.files["delete"]({
    fileId: fileId
  }, function(err, res) {
    if (err) {
      console.log("cannot delete file ", err);
      return deferred.reject(err);
    } else {
      return deferred.resolve(res);
    }
  });
  return deferred.promise;
};

exports.getUserCalendars = function(tokens) {
  var deferred;
  oauth2Client.setCredentials(tokens);
  deferred = Q.defer();
  calendar.calendarList.list({}, function(err, calendars) {
    if (err) {
      console.error('err: ', err);
      deferred.reject(err);
    } else {

    }
    return deferred.resolve(calendars.items.map(function(item) {
      return result({
        accessRole: item.accessRole,
        id: item.id,
        backgroundColor: item.backgroundColor,
        foregroundColor: item.foregroundColor,
        name: item.summary,
        selected: item.selected,
        description: item.description
      });
    }));
  });
  return deferred.promise;
};

exports.getUserEvents = function(tokens, sinceDate, untilDate, calendarId) {
  var deferred, timeMax, timeMin;
  deferred = Q.defer();
  timeMin = moment(parseInt(sinceDate)).toISOString();
  timeMax = moment(parseInt(untilDate)).toISOString();
  oauth2Client.setCredentials(tokens);
  calendar.events.list({
    calendarId: encodeURIComponent(calendarId),
    showHiddenInvitations: true,
    timeMin: timeMin,
    timeMax: timeMax,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, events) {
    var item, items, j, len, results;
    if (err) {
      console.error('calendarId: ' + calendarId(+', err: ', err));
      return deferred.reject(err);
    } else {
      results = [];
      items = events.items;
      for (j = 0, len = items.length; j < len; j++) {
        item = items[j];
        results.push({
          id: item.id,
          name: item.summary,
          start_time: item.start.dateTime,
          end_time: item.end.dateTime,
          description: item.description,
          rsvp_status: item.status,
          start: item.start.date,
          creator: item.creator,
          htmlLink: item.htmlLink,
          location: item.location
        });
      }
      return deferred.resolve(results);
    }
  });
  return deferred.promise;
};
