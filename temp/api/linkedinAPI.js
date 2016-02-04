
/*
 * LINKED IN WEB API
 * see https://developer.linkedin.com/docs
 */
var CLIENT_ID, CLIENT_SECRET, Q, REDIRECT_URI, fs, getOAuthURL, getUserInfo, http, https, postMessage, pushCode, querystring, request;

https = require('https');

http = require('http');

request = require('request');

Q = require('q');

fs = require('fs');

querystring = require('querystring');

CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;

CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

REDIRECT_URI = process.env.APP_URL + '/linkedin2callback';

getOAuthURL = function() {
  return 'https://www.linkedin.com/uas/oauth2/authorization?response_type=code&client_id=' + CLIENT_ID + '&redirect_uri=' + REDIRECT_URI;
};

pushCode = function(code) {
  var deferred, post_data, post_options, post_req;
  deferred = Q.defer();
  post_data = querystring.stringify({
    'client_id': CLIENT_ID,
    'client_secret': CLIENT_SECRET,
    'redirect_uri': REDIRECT_URI,
    'grant_type': 'authorization_code',
    'code': code
  });
  post_options = {
    host: 'www.linkedin.com',
    port: 443,
    path: '/uas/oauth2/accessToken',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length
    }
  };
  post_req = https.request(post_options, function(res) {
    res.setEncoding('utf8');
    return res.on('data', function(chunk) {
      return deferred.resolve(JSON.parse(chunk));
    });
  });
  post_req.on('error', function(e) {
    return deferred.reject(new Error(e));
  });
  post_req.write(post_data);
  post_req.end();
  return deferred.promise;
};

getUserInfo = function(tokens) {
  var deferred, req, req_options;
  deferred = Q.defer();
  req_options = {
    host: 'api.linkedin.com',
    port: 443,
    path: '/v1/people/~?format=json',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + tokens.access_token
    }
  };
  req = https.request(req_options, function(res) {
    var data;
    data = '';
    res.on('data', function(chunk) {
      return data += chunk;
    });
    return res.on('end', function() {
      var userInfo;
      userInfo = JSON.parse(data);
      return deferred.resolve({
        userName: userInfo.firstName + ' ' + userInfo.lastName
      });
    });
  });
  req.on('error', function(e) {
    console.log('get user infos error: ', e);
    return deferred.reject(new Error(e));
  });
  req.end();
  return deferred.promise;
};

postMessage = function(tokens, message) {
  var deferred, post_data;
  deferred = Q.defer();
  post_data = {
    comment: message,
    visibility: {
      code: 'anyone'
    }
  };
  request({
    uri: 'https://api.linkedin.com/v1/people/~/shares?format=json',
    auth: {
      bearer: tokens.access_token
    },
    method: 'POST',
    json: true,
    body: post_data
  }, function(error, response, body) {
    if (error) {
      return deferred.reject(new Error(error));
    } else {
      if (body.status === 400) {
        return deferred.reject(new Error(body.message));
      } else {
        return deferred.resolve(body);
      }
    }
  });
  return deferred.promise;
};

exports.getOAuthURL = getOAuthURL;

exports.pushCode = pushCode;

exports.getUserInfo = getUserInfo;

exports.postMessage = postMessage;
