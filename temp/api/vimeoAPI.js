
/*
 * VIMEO WEB API
 *  see https://developer.vimeo.com/api/
 */
var CLIENT_ID, CLIENT_SECRET, DESCRIPTION_MAX_LENGTH, Q, REDIRECT_URL, finalizeUpload, fs, generateUploadTicket, getUnauthenticatedToken, https, patchMetadata, processGetRequest, processOrder, publishVideo, request, unauthenticatedToken, verifyUpload;

Q = require('q');

request = require('request');

https = require('https');

fs = require('fs');

CLIENT_ID = process.env.VIMEO_CLIENT_ID;

CLIENT_SECRET = process.env.VIMEO_CLIENT_SECRET;

REDIRECT_URL = process.env.APP_URL + '/vimeo2callback';

DESCRIPTION_MAX_LENGTH = 1250;

unauthenticatedToken = null;

exports.getOAuthURL = function() {
  "https://api.vimeo.com/oauth/authorize?response_type=code&client_id=" + CLIENT_ID + "&redirect_uri=" + REDIRECT_URL;
  return +"&scope=" + encodeURI('public private purchased create edit delete upload interact');
};

exports.pushCode = function(code, userId) {
  var deferred;
  deferred = Q.defer();
  request({
    method: 'POST',
    uri: 'https://api.vimeo.com/oauth/access_token',
    auth: {
      user: CLIENT_ID,
      pass: CLIENT_SECRET
    },
    form: {
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URL,
      code: code
    }
  }, function(err, response, body) {
    var results;
    if (err) {
      console.log("Err: ", err);
      return deferred.reject(err);
    } else {
      results = JSON.parse(body);
      if (results.error) {
        return deferred.reject(results);
      } else {
        return deferred.resolve(results);
      }
    }
  });
  return deferred.promise;
};

getUnauthenticatedToken = function() {
  var deferred;
  deferred = Q.defer();
  request({
    method: 'POST',
    uri: 'https://api.vimeo.com/oauth/authorize/client',
    auth: {
      user: CLIENT_ID,
      pass: CLIENT_SECRET
    },
    form: {
      grant_type: 'client_credentials',
      redirect_uri: REDIRECT_URL
    }
  }, function(err, response, body) {
    var results;
    if (err) {
      console.log("Err: ", err);
      return deferred.reject(err);
    } else {
      results = JSON.parse(body);
      console.log('UnauthenticatedToken ?', results);
      if (results.error) {
        return deferred.reject(results);
      } else {
        unauthenticatedToken = results;
        return deferred.resolve(results);
      }
    }
  });
  return deferred.promise;
};

exports.getUserInfo = function(tokens) {
  var deferred, userInfo;
  deferred = Q.defer();
  userInfo = {
    userName: tokens.user.name
  };
  delete tokens.user;
  deferred.resolve(userInfo);
  return deferred.promise;
};

exports.listMedia = function(tokens) {
  return processGetRequest(tokens.access_token, '/me/videos', function(response) {
    var counts, getStat, medias;
    counts = {
      view: 0,
      comment: 0,
      like: 0
    };
    getStat = function(name) {
      return {
        name: name,
        value: counts[name]
      };
    };
    return medias = {
      list: response.data.map(function(video) {
        video.id = video.uri.substr(video.uri.lastIndexOf('/') + 1);
        video.title = video.name;
        video.thumbnailURL = video.pictures.sizes[0].link;
        video.creationDate = video.created_time;
        counts.view += video.stats.plays;
        counts.comment += video.metadata.connections.comments.total;
        counts.like += video.metadata.connections.likes.total;
        video.counts = {
          view: video.stats.plays,
          comment: video.metadata.connections.comments.total,
          like: video.metadata.connections.likes.total
        };
        delete video.stats;
        delete video.metadata.connections;
        return video;
      }),
      stats: [getStat('view'), getStat('comment'), getStat('like')]
    };
  });
};

exports.searchVideo = function(videoName, limit, order, page) {
  var sort, url;
  url = '/videos?query=' + encodeURI(videoName) + '&per_page=' + limit;
  if (page) {
    url += '&page=' + page;
  }
  sort = processOrder(order);
  url += '&sort=' + sort;
  return processGetRequest(unauthenticatedToken.access_token, url, function(response) {
    var result;
    return result = {
      videos: response.data.map(function(result) {
        var video;
        video = {};
        video.id = result.uri.substr(result.uri.lastIndexOf('/') + 1);
        video.title = result.name;
        video.thumbnailURL = result.pictures.sizes[0].link;
        video.creationDate = result.created_time;
        if (result.description && result.description.length > DESCRIPTION_MAX_LENGTH) {
          video.description = result.description.substr(0, DESCRIPTION_MAX_LENGTH);
        } else {
          video.description = result.description;
        }
        video.duration = result.duration;
        video.channel = result.user.name;
        video.channelURL = result.user.link;
        video.counts = {
          view: result.stats.plays,
          comment: result.metadata.connections.comments.total,
          like: result.metadata.connections.likes.total
        };
        return video;
      }),
      totalResults: response.total,
      next: response.next,
      previous: response.previous,
      first: response.first,
      last: response.last,
      page: response.page
    };
  });
};

processOrder = function(order) {
  switch (order) {
    case 'date':
      return 'date';
    case 'rating':
      return 'likes';
    case 'relevance':
      return 'relevant';
    case 'viewCount':
      return 'plays';
    default:
      return void 0;
  }
};

exports.sendVideo = function(tokens, file, userId, params, providerOptions) {
  var completeURI, deferred, uploadLink, videoId;
  deferred = Q.defer();
  uploadLink = null;
  completeURI = null;
  videoId = null;
  generateUploadTicket(tokens).then(function(ticket) {
    console.log('upload to ' + ticket.upload_link_secure);
    uploadLink = ticket.upload_link_secure;
    completeURI = ticket.complete_uri;
    return publishVideo(ticket.upload_link_secure, tokens, file);
  }).then(function() {
    return verifyUpload(uploadLink, tokens);
  }).then(function() {
    return finalizeUpload(completeURI, tokens);
  }).then(function(id) {
    videoId = id;
    console.log("finalizeUpload videoId: ", videoId);
    return patchMetadata(tokens, videoId, params.title, params.description, providerOptions);
  }).then(function() {
    return deferred.resolve({
      url: 'https://vimeo.com/' + videoId
    });
  }).fail(function(err) {
    return deferred.reject(err);
  });
  return deferred.promise;
};

generateUploadTicket = function(tokens) {
  var deferred;
  deferred = Q.defer();
  request({
    method: 'POST',
    uri: 'https://api.vimeo.com/me/videos',
    auth: {
      bearer: tokens.access_token
    },
    form: {
      type: 'streaming'
    }
  }, function(err, response, body) {
    var results;
    if (err) {
      return deferred.reject(err);
    } else {
      results = JSON.parse(body);
      if (results.error) {
        return deferred.reject(results);
      } else {
        return deferred.resolve(results);
      }
    }
  });
  return deferred.promise;
};

publishVideo = function(uploadLink, tokens, file) {
  var deferred, stat;
  deferred = Q.defer();
  stat = fs.statSync(file.path);
  request({
    method: 'PUT',
    uri: uploadLink,
    auth: {
      bearer: tokens.access_token
    },
    headers: {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4'
    },
    body: fs.readFileSync(file.path)
  }, function(err, response, body) {
    var results;
    if (err) {
      console.log("cannot publish the video. Err: ", err);
      return deferred.reject(err);
    } else {
      results = JSON.parse(body);
      console.log('publishVideo statusCode ?', response.statusCode);
      if (body.error) {
        return deferred.reject(body.error);
      } else {
        return deferred.resolve(body);
      }
    }
  });
  return deferred.promise;
};

verifyUpload = function(uploadLink, tokens) {
  var deferred;
  deferred = Q.defer();
  request({
    method: 'PUT',
    uri: uploadLink,
    auth: {
      bearer: tokens.access_token
    },
    headers: {
      'Content-Range': 'bytes */*'
    }
  }, function(err, response, body) {
    if (err) {
      console.log("cannot verifyUpload. Err: ", err);
      return deferred.reject(err);
    } else {
      console.log('verifyUpload statusCode ?', response.statusCode);
      console.log("headers range: ", response.headers.range);
      if (body.error) {
        return deferred.reject(body.error);
      } else {
        return deferred.resolve(body);
      }
    }
  });
  return deferred.promise;
};

finalizeUpload = function(completeURI, tokens) {
  var deferred;
  console.log("completeURI? ", completeURI);
  deferred = Q.defer();
  request({
    method: 'DELETE',
    uri: 'https://api.vimeo.com' + completeURI,
    auth: {
      bearer: tokens.access_token
    }
  }, function(err, response, body) {
    var location;
    if (err) {
      console.log("cannot finalizeUpload. Err: ", err);
      return deferred.reject(err);
    } else {
      if (response.statusCode !== 201) {
        return deferred.reject(body.error);
      } else {
        location = response.headers.location;
        return deferred.resolve(location.substr(location.lastIndexOf('/') + 1));
      }
    }
  });
  return deferred.promise;
};

patchMetadata = function(tokens, videoId, title, description, providerOptions) {
  var deferred;
  console.log("vimeo patchMetadata providerOptions", providerOptions);
  deferred = Q.defer();
  request({
    method: 'PATCH',
    json: true,
    uri: 'https://api.vimeo.com/videos/' + videoId,
    auth: {
      bearer: tokens.access_token
    },
    body: {
      name: title,
      description: description,
      privacy: {
        view: providerOptions.privacyStatus
      }
    }
  }, function(err, response, body) {
    if (err) {
      console.log("cannot patchMetadata. Err: ", err);
      return deferred.reject(err);
    } else {
      console.log('patchMetadata statusCode ?', response.statusCode);
      if (body.error) {
        return deferred.reject(body.error);
      } else {
        return deferred.resolve();
      }
    }
  });
  return deferred.promise;
};

processGetRequest = function(access_token, path, callback) {
  var deferred, req, req_options;
  deferred = Q.defer();
  req_options = {
    host: 'api.vimeo.com',
    port: 443,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + access_token
    }
  };
  req = https.request(req_options, function(res) {
    var data;
    data = "";
    res.on('data', function(chunk) {
      return data += chunk;
    });
    return res.on('end', function() {
      return deferred.resolve(callback(JSON.parse(data)));
    });
  });
  req.on('error', function(err) {
    return deferred.reject(err);
  });
  req.end();
  return deferred.promise;
};

getUnauthenticatedToken();
