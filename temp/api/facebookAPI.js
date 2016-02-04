
/*
 * FACEBOOK WEB API
 * see https://developers.facebook.com/docs/graph-api/using-graph-api/v2.5
 */
var APP_ID, APP_SECRET, Q, REDIRECT_URI, appToken, fs, getAppToken, getOAuthURL, getUserInfo, getVideoData, https, moment, postMessage, processGetRequest, publishOnFeed, pushCode, querystring, refreshTokens, request, saveTokensForUser, search, tagsAsHashtags, userDAO;

APP_ID = process.env.FACEBOOK_APP_ID;

APP_SECRET = process.env.FACEBOOK_APP_SECRET;

REDIRECT_URI = process.env.APP_URL + '/facebook2callback';

querystring = require('querystring');

https = require('https');

Q = require('q');

request = require('request');

fs = require('fs');

userDAO = require('../userDAO.js');

moment = require('moment');

appToken = null;

pushCode = function(code) {
  var deferred, req, req_options;
  deferred = Q.defer();
  req_options = {
    host: 'graph.facebook.com',
    port: 443,
    path: '/v2.3/oauth/access_token?client_id=' + APP_ID + '&redirect_uri=' + REDIRECT_URI + '&client_secret=' + APP_SECRET + '&code=' + code,
    method: 'GET'
  };
  req = https.request(req_options, function(res) {
    var data;
    data = "";
    res.on('data', function(chunk) {
      return data += chunk;
    });
    return res.on('end', function() {
      console.log("code validated ?  ", data);
      return deferred.resolve(JSON.parse(data));
    });
  });
  req.on('error', function(e) {
    console.log('FB authentication error: ', e);
    return deferred.reject(new Error(e));
  });
  req.end();
  return deferred.promise;
};

refreshTokens = function(tokens, userId) {
  var deferred, req, req_options;
  deferred = Q.defer();
  req_options = {
    host: 'graph.facebook.com',
    port: 443,
    path: '/v2.3/oauth/access_token?grant_type=fb_exchange_token&client_id=' + APP_ID + '&redirect_uri=' + REDIRECT_URI + '&client_secret=' + APP_SECRET + '&fb_exchange_token=' + tokens.access_token,
    method: 'GET'
  };
  req = https.request(req_options, function(res) {
    var data;
    data = "";
    res.on('data', function(chunk) {
      return data += chunk;
    });
    return res.on('end', function() {
      var refreshedToken;
      console.log("code validated ?  ", data);
      refreshedToken = JSON.parse(data);
      return deferred.resolve(saveTokensForUser(refreshedToken, userId));
    });
  });
  req.on('error', function(e) {
    console.log('upload url error: ', e);
    return deferred.reject(e);
  });
  req.end();
  return deferred.promise;
};

saveTokensForUser = function(tokens, userId) {
  tokens.expiry_date = Date.now() + tokens.expires_in;
  delete tokens.expires_in;
  userDAO.updateUserTokens(userId, 'facebook', tokens);
  return tokens;
};

tagsAsHashtags = function(tags) {
  var hastags, i, len, tag;
  if (tags === void 0) {
    return "";
  }
  hastags = "\n\n";
  for (i = 0, len = tags.length; i < len; i++) {
    tag = tags[i];
    hastags += "#" + tags + " ";
  }
  return hastags;
};

exports.getUserGroups = function(tokens) {
  return processGetRequest(tokens.access_token, '/me/groups', function(groupsData) {
    return groupsData.data;
  });
};

exports.getUserEvents = function(tokens, sinceDate, untilDate) {
  sinceDate = moment(parseInt(sinceDate)).unix();
  untilDate = moment(parseInt(untilDate)).unix();
  return processGetRequest(tokens.access_token, '/me/events?limit=100&since=' + sinceDate + '&until=' + untilDate, function(events) {
    return events.data;
  });
};

exports.sendVideo = function(token, file, user, params, providerOptions) {
  var deferred, formData, targetId;
  deferred = Q.defer();
  targetId = 'me';
  if (providerOptions.group) {
    targetId = providerOptions.group.id;
  }
  formData = {
    access_token: token.access_token,
    source: fs.createReadStream(file.path),
    title: params.title,
    description: params.description + tagsAsHashtags(params.tags)
  };
  console.log("providerOptions? ", providerOptions);
  if (providerOptions === void 0) {
    formData["privacy.value"] = 'SELF';
  } else {
    formData["privacy.value"] = providerOptions.visibility;
  }
  request({
    method: 'POST',
    uri: 'https://graph-video.facebook.com/v2.5/' + targetId + '/videos',
    formData: formData
  }, function(err, response, body) {
    var videoId;
    if (err) {
      return deferred.reject(err);
    } else {
      console.log('FB Video Upload Response body: ', body);
      videoId = JSON.parse(body).id;
      return deferred.resolve({
        url: 'https://www.facebook.com/' + videoId
      });
    }
  });
  return deferred.promise;
};

getVideoData = function(videoId, tokens) {
  return processGetRequest(tokens.access_token, '/' + videoId + '/thumbnails', function(videoData) {
    return videoData;
  });
};

getOAuthURL = function() {
  return 'https://graph.facebook.com/oauth/authorize?client_id=' + APP_ID + '&redirect_uri=' + REDIRECT_URI + '&scope=public_profile +publish_actions+user_posts+user_managed_groups+manage_pages+read_insights+user_events';
};

postMessage = function(tokens, message, providerOptions) {
  return publishOnFeed(tokens, {
    message: message
  }, providerOptions);
};

exports.postMediaLink = function(tokens, message, url, title, description, providerOptions) {
  return publishOnFeed(tokens, {
    message: message,
    link: url,
    name: title,
    caption: description,
    description: description
  }, providerOptions);
};

publishOnFeed = function(tokens, data, providerOptions) {
  var deferred;
  data.access_token = tokens.access_token;
  if (providerOptions === void 0) {
    data["privacy.value"] = 'SELF';
  } else {
    data["privacy.value"] = providerOptions.visibility;
  }
  deferred = Q.defer();
  request({
    method: 'POST',
    uri: 'https://graph.facebook.com/me/feed',
    json: true,
    body: data
  }, function(err, response, body) {
    var id;
    if (err) {
      return deferred.reject(err);
    } else {
      console.log("publishOnFeed response body: ", body);
      id = body.id;
      body.url = 'https://www.facebook.com/yug357/posts/' + id.split('_')[1];
      return deferred.resolve(body);
    }
  });
  return deferred.promise;
};

exports.getPages = function(tokens) {
  return processGetRequest(tokens.access_token, '/me/accounts?locale=fr_FR', function(pages) {
    console.log("Facebook users pages: ", pages.data);
    return pages.data;
  });
};

getUserInfo = function(tokens) {
  return processGetRequest(tokens.access_token, '/me', function(userInfo) {
    return {
      userName: userInfo.name
    };
  });
};

processGetRequest = function(access_token, path, callback, isOldPath) {
  var deferred, req, req_options;
  deferred = Q.defer();
  req_options = {
    host: 'graph.facebook.com',
    port: 443,
    path: isOldPath ? path : '/v2.5' + path,
    method: 'GET'
  };
  if (access_token) {
    req_options.headers = {
      'Authorization': 'Bearer ' + access_token
    };
  } else {
    req_options.headers = {
      'Authorization': 'Bearer ' + appToken.access_token
    };
  }
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
  req.on('error', function(e) {
    console.log('processRequest error: ', e);
    return deferred.reject(e);
  });
  req.end();
  return deferred.promise;
};

exports.searchPage = function(tokens, pageName) {
  return search((tokens !== void 0 ? tokens.access_token : void 0), pageName, 'page', 'id,name,category,picture,about,likes');
};

search = function(access_token, query, searchType, fields) {
  var url;
  url = '/search?q=' + encodeURI(query) + '&type=' + searchType + '&fields=' + fields + '&locale=fr_FR';
  if (!access_token) {
    url += '&access_token=' + appToken.access_token;
  }
  return processGetRequest(access_token, url, function(elements) {
    if (searchType !== 'page') {
      return elements.data;
    } else {
      return elements.data.map(function(page) {
        page.thumbnailURL = page.picture.data.url;
        page.description = page.about;
        delete page.picture;
        delete page.about;
        return page;
      });
    }
  }, true);
};

exports.getPageMetrics = function(tokens, metricType, pageId, sinceDate, untilDate) {
  return processGetRequest((tokens !== void 0 ? tokens.access_token : void 0), '/' + pageId + '/insights?metric=' + metricType + '&since=' + sinceDate + '&until=' + untilDate, function(metrics) {
    return metrics.data;
  });
};

getAppToken = function() {
  var deferred, req, req_options;
  deferred = Q.defer();
  req_options = {
    host: 'graph.facebook.com',
    port: 443,
    path: '/v2.3/oauth/access_token?client_id=' + APP_ID + '&grant_type=client_credentials&client_secret=' + APP_SECRET,
    method: 'GET'
  };
  req = https.request(req_options, function(res) {
    var data;
    data = "";
    res.on('data', function(chunk) {
      return data += chunk;
    });
    return res.on('end', function() {
      var results;
      results = JSON.parse(data);
      appToken = results;
      console.log("appToken? ", appToken);
      return deferred.resolve(results);
    });
  });
  req.on('error', function(e) {
    console.log('FB getAppToken error: ', e);
    return deferred.reject(e);
  });
  req.end();
  return deferred.promise;
};

getAppToken();

exports.pushCode = pushCode;

exports.sendVideo = sendVideo;

exports.getOAuthURL = getOAuthURL;

exports.postMessage = postMessage;

exports.refreshTokens = refreshTokens;

exports.getUserInfo = getUserInfo;

exports.getVideoData = getVideoData;
