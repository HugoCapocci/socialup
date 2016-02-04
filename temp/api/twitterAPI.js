
/*
 * TWITTER WEB API
 * see https://dev.twitter.com/rest/public
 */
var APP_KEY, APP_SECRET, Q, REDIRECT_URL, TOKEN, TOKEN_SECRET, bodyToTokens, createSignature, createSignatureBaseString, createSigningKey, crypto, fs, getAccessToken, getOAuthURL, getSignature, getTokens, getTweets, getUserInfo, http, https, inLineParams, oAuthNonce, percentEncode, postMessage, processGetRequest, querystring, request;

https = require('https');

http = require('http');

request = require('request');

Q = require('q');

fs = require('fs');

querystring = require('querystring');

oAuthNonce = require('./oauth_nonce.js');

crypto = require('crypto');

APP_KEY = process.env.TWITTER_APP_KEY;

APP_SECRET = process.env.TWITTER_APP_SECRET;

REDIRECT_URL = process.env.APP_URL + '/twitter2callback?state=';

TOKEN = process.env.TWITTER_ACCESS_TOKEN;

TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET;

getOAuthURL = function() {
  return 'https://api.twitter.com/oauth/authorize';
};

getTokens = function(userId) {
  var deferred, headerParams, url;
  deferred = Q.defer();
  headerParams = {
    'oauth_callback': REDIRECT_URL + userId,
    'oauth_consumer_key': APP_KEY,
    'oauth_nonce': oAuthNonce(),
    'oauth_signature_method': 'HMAC-SHA1',
    'oauth_timestamp': Math.round(new Date() / 1000),
    'oauth_token': TOKEN,
    'oauth_version': '1.0'
  };
  url = 'https://api.twitter.com/oauth/request_token';
  headerParams.oauth_signature = getSignature(headerParams, 'post', url, TOKEN_SECRET, APP_SECRET);
  request({
    uri: url,
    headers: {
      'Authorization': 'OAuth ' + inLineParams(headerParams)
    },
    method: "POST"
  }, function(error, response, body) {
    if (error) {
      return deferred.reject(error);
    } else {
      return deferred.resolve(bodyToTokens(body));
    }
  });
  return deferred.promise;
};

inLineParams = function(params) {
  var i, key, keys, len, line;
  keys = Object.keys(params);
  keys.sort();
  line = '';
  for (i = 0, len = keys.length; i < len; i++) {
    key = keys[i];
    line += key + '="' + percentEncode(params[key]) + '",';
  }
  return line.substring(0, line.length - 1);
};

createSignatureBaseString = function(params, httpMethod, url) {
  var i, key, keys, len, line;
  keys = Object.keys(params);
  keys.sort();
  line = '';
  for (i = 0, len = keys.length; i < len; i++) {
    key = keys[i];
    line += '&' + key + '=' + percentEncode(params[key]);
  }
  return httpMethod.toUpperCase() + '&' + percentEncode(url) + '&' + percentEncode(line.substring(1));
};

createSigningKey = function(consumerSecret, tokenSecret) {
  return percentEncode(consumerSecret) + '&' + percentEncode(tokenSecret);
};

createSignature = function(baseString, signingKey) {
  var hmac;
  hmac = crypto.createHmac('sha1', signingKey);
  return hmac.update(baseString).digest('base64');
};

getSignature = function(params, httpMethod, url, tokenSecret, consumerSecret) {
  var baseString;
  baseString = createSignatureBaseString(params, httpMethod, url);
  return createSignature(baseString, createSigningKey(consumerSecret, tokenSecret));
};

percentEncode = function(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
};

getAccessToken = function(oauthVerifier, tokens) {
  var deferred, headerParams, token_secret, url;
  deferred = Q.defer();
  headerParams = {
    'oauth_consumer_key': APP_KEY,
    'oauth_nonce': oAuthNonce(),
    'oauth_signature_method': 'HMAC-SHA1',
    'oauth_timestamp': Math.round(new Date() / 1000),
    'oauth_token': tokens.oauth_token,
    'oauth_version': '1.0'
  };
  url = 'https://api.twitter.com/oauth/access_token';
  token_secret = tokens.oauth_token_secret;
  if (token_secret === void 0) {
    token_secret = TOKEN_SECRET;
  }
  headerParams.oauth_signature = getSignature(headerParams, 'post', url, token_secret, APP_SECRET);
  request({
    uri: url,
    headers: {
      'Authorization': 'OAuth ' + inLineParams(headerParams)
    },
    method: "POST",
    form: {
      oauth_verifier: oauthVerifier
    }
  }, function(error, response, body) {
    if (error) {
      return deferred.reject(error);
    } else {
      return deferred.resolve(bodyToTokens(body));
    }
  });
  return deferred.promise;
};

postMessage = function(tokens, message) {
  var deferred, globalParams, headerParams, url;
  deferred = Q.defer();
  headerParams = {
    'oauth_consumer_key': APP_KEY,
    'oauth_nonce': oAuthNonce(),
    'oauth_signature_method': 'HMAC-SHA1',
    'oauth_timestamp': Math.round(new Date() / 1000),
    'oauth_token': tokens.oauth_token,
    'oauth_version': '1.0'
  };
  globalParams = headerParams;
  globalParams.status = message;
  url = 'https://api.twitter.com/1.1/statuses/update.json';
  headerParams.oauth_signature = getSignature(globalParams, 'post', url, tokens.oauth_token_secret, APP_SECRET);
  request({
    uri: url,
    headers: {
      'Authorization': 'OAuth ' + inLineParams(headerParams)
    },
    method: "POST",
    form: {
      status: message
    }
  }, function(error, response, body) {
    var results;
    if (error) {
      return deferred.reject(error);
    } else {
      results = JSON.parse(body);
      url = 'https://twitter.com/' + results.user.screen_name + '/status/' + results.id_str;
      console.log("tweet published: ", url);
      return deferred.resolve({
        url: url
      });
    }
  });
  return deferred.promise;
};

getTweets = function(tokens) {
  var deferred, globalParams, headerParams, url;
  deferred = Q.defer();
  headerParams = {
    'oauth_consumer_key': APP_KEY,
    'oauth_nonce': oAuthNonce(),
    'oauth_signature_method': 'HMAC-SHA1',
    'oauth_timestamp': Math.round(new Date() / 1000),
    'oauth_token': tokens.oauth_token,
    'oauth_version': '1.0'
  };
  globalParams = headerParams;
  globalParams.user_id = tokens.user_id;
  url = 'https://api.twitter.com/1.1/statuses/user_timeline.json';
  headerParams.oauth_signature = getSignature(globalParams, 'get', url, tokens.oauth_token_secret, APP_SECRET);
  request({
    uri: url + '?user_id=' + tokens.user_id,
    headers: {
      'Authorization': 'OAuth ' + inLineParams(headerParams)
    },
    method: "GET"
  }, function(error, response, body) {
    if (error) {
      return deferred.reject(error);
    } else {
      return deferred.resolve(response);
    }
  });
  return deferred.promise;
};

exports.verifyCredentials = function(tokens) {
  return processGetRequest(tokens, 'https://api.twitter.com/1.1/account/verify_credentials.json', function(body, response) {
    return response.statusCode;
  });
};

getUserInfo = function(tokens) {
  return processGetRequest(tokens, 'https://api.twitter.com/1.1/account/settings.json', function(body) {
    var userInfo;
    userInfo = JSON.parse(body);
    return {
      userName: userInfo.screen_name
    };
  });
};

processGetRequest = function(tokens, url, callback) {
  var deferred, globalParams, headerParams;
  deferred = Q.defer();
  headerParams = {
    'oauth_consumer_key': APP_KEY,
    'oauth_nonce': oAuthNonce(),
    'oauth_signature_method': 'HMAC-SHA1',
    'oauth_timestamp': Math.round(new Date() / 1000),
    'oauth_token': tokens.oauth_token,
    'oauth_version': '1.0'
  };
  globalParams = headerParams;
  headerParams.oauth_signature = getSignature(globalParams, 'get', url, tokens.oauth_token_secret, APP_SECRET);
  request({
    uri: url,
    headers: {
      'Authorization': 'OAuth ' + inLineParams(headerParams)
    },
    method: "GET"
  }, function(error, response, body) {
    if (error) {
      return deferred.reject(error);
    } else {
      return deferred.resolve(callback(body, response));
    }
  });
  return deferred.promise;
};

bodyToTokens = function(body) {
  var elems, i, len, token, tokenArray, tokens;
  tokenArray = body.split('&');
  tokens = {};
  for (i = 0, len = tokenArray.length; i < len; i++) {
    token = tokenArray[i];
    elems = token.split('=');
    tokens[elems[0]] = elems[1];
  }
  return tokens;
};

exports.getUserInfo = getUserInfo;

exports.getOAuthURL = getOAuthURL;

exports.getTokens = getTokens;

exports.createSignatureBaseString = createSignatureBaseString;

exports.createSigningKey = createSigningKey;

exports.createSignature = createSignature;

exports.getAccessToken = getAccessToken;

exports.postMessage = postMessage;

exports.getTweets = getTweets;

exports.getSignature = getSignature;

exports.bodyToTokens = bodyToTokens;
