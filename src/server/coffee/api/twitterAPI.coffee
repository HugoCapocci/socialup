###
# TWITTER WEB API
# see https://dev.twitter.com/rest/public
###

https = require('https')
http = require('http')
request = require('request')
bluebird = require 'bluebird'
fs = require('fs')
querystring = require('querystring')
oAuthNonce = require('./oauth_nonce')
crypto = require('crypto')
APP_KEY = process.env.TWITTER_APP_KEY
APP_SECRET = process.env.TWITTER_APP_SECRET
REDIRECT_URL = process.env.APP_URL + '/twitter2callback?state='
TOKEN = process.env.TWITTER_ACCESS_TOKEN
TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET

getOAuthURL = () ->
  'https://api.twitter.com/oauth/authorize'

#request a token by post
getTokens = (userId) ->
  new bluebird (fulfill, reject) ->
    headerParams =
      'oauth_callback': REDIRECT_URL + userId
      'oauth_consumer_key': APP_KEY
      'oauth_nonce': oAuthNonce()
      'oauth_signature_method': 'HMAC-SHA1'
      'oauth_timestamp': Math.round(new Date() / 1000)
      'oauth_token': TOKEN
      'oauth_version': '1.0'
    url = 'https://api.twitter.com/oauth/request_token'
    headerParams.oauth_signature = getSignature headerParams, 'post', url, TOKEN_SECRET, APP_SECRET
    request
      uri: url
      headers:
        'Authorization': 'OAuth ' + inLineParams headerParams
      method: 'POST'
    ,(error, response, body) ->
      if error
        reject error
      else
        fulfill bodyToTokens(body)

inLineParams = (params) ->
  keys = Object.keys params
  keys.sort()
  line = ''
  for key in keys
    line += key + '="' + percentEncode(params[key]) + '",'
  line.substring 0, line.length - 1

# see https://dev.twitter.com/oauth/overview/creating-signatures
createSignatureBaseString = (params, httpMethod, url) ->
  keys = Object.keys params
  keys.sort()
  line = ''
  for key in keys
    line += '&' + key + '=' + percentEncode params[key]
  httpMethod.toUpperCase() + '&' + percentEncode(url) + '&' + percentEncode(line.substring 1)

createSigningKey = (consumerSecret, tokenSecret) ->
  percentEncode(consumerSecret) + '&' + percentEncode tokenSecret

createSignature = (baseString, signingKey) ->
  hmac = crypto.createHmac 'sha1', signingKey
  hmac.update(baseString).digest 'base64'

#APP_SECRET
getSignature = (params, httpMethod, url, tokenSecret, consumerSecret) ->
  baseString = createSignatureBaseString params, httpMethod, url
  createSignature baseString, createSigningKey consumerSecret, tokenSecret

# 'percent encode'
percentEncode = (str) ->
  encodeURIComponent(str).replace /[!'()*]/g, (c) ->
    '%' + c.charCodeAt(0).toString 16

#last step of the authentication validation
getAccessToken = (oauthVerifier, tokens) ->
  new bluebird (fulfill, reject) ->
    headerParams =
      'oauth_consumer_key': APP_KEY
      'oauth_nonce': oAuthNonce()
      'oauth_signature_method': 'HMAC-SHA1'
      'oauth_timestamp': Math.round(new Date() / 1000)
      'oauth_token': tokens.oauth_token
      'oauth_version': '1.0'
    url = 'https://api.twitter.com/oauth/access_token'
    token_secret = tokens.oauth_token_secret
    if token_secret is undefined
      token_secret = TOKEN_SECRET
    headerParams.oauth_signature = getSignature headerParams, 'post', url, token_secret, APP_SECRET
    request
      uri: url
      headers:
        'Authorization': 'OAuth ' + inLineParams headerParams
      method: 'POST'
      form:
        oauth_verifier: oauthVerifier
    , (error, response, body) ->
      if error
        reject error
      else
        fulfill bodyToTokens body

postMessage = (tokens, message) ->
  new bluebird (fulfill, reject) ->
    headerParams =
      'oauth_consumer_key': APP_KEY
      'oauth_nonce': oAuthNonce()
      'oauth_signature_method': 'HMAC-SHA1'
      'oauth_timestamp': Math.round(new Date() / 1000)
      'oauth_token': tokens.oauth_token
      'oauth_version': '1.0'
    globalParams = headerParams
    globalParams.status = message
    url = 'https://api.twitter.com/1.1/statuses/update.json'
    headerParams.oauth_signature = getSignature globalParams, 'post', url, tokens.oauth_token_secret, APP_SECRET
    request
      uri: url
      headers:
        'Authorization': 'OAuth ' + inLineParams headerParams
      method: 'POST'
      form:
        status: message
    , (error, response, body) ->
      if error
        reject error
      else
        results = JSON.parse body
        url = 'https://twitter.com/' + results.user.screen_name + '/status/' + results.id_str
        console.log "tweet published: #{url}"
        fulfill url:url

getTweets = (tokens) ->
  resolver = bluebird.defer()
  headerParams =
    'oauth_consumer_key': APP_KEY
    'oauth_nonce': oAuthNonce()
    'oauth_signature_method': 'HMAC-SHA1'
    'oauth_timestamp': Math.round(new Date() / 1000)
    'oauth_token': tokens.oauth_token
    'oauth_version': '1.0'
  globalParams = headerParams
  globalParams.user_id = tokens.user_id
  url = 'https://api.twitter.com/1.1/statuses/user_timeline.json'
  console.log 'get signature'
  headerParams.oauth_signature = getSignature globalParams, 'get', url, tokens.oauth_token_secret, APP_SECRET
  console.log 'headerParams.oauth_signature: ',headerParams.oauth_signature
  console.log 'get request'
  request
    uri: url + '?user_id=' + tokens.user_id
    headers:
      'Authorization': 'OAuth ' + inLineParams headerParams
    method: 'GET'
  , (error, response, body) ->
    if error
      resolver.reject error
    else
      resolver.resolve response
  return resolver.promise

  #return 200 if token is valid
  exports.verifyCredentials = (tokens) ->
    processGetRequest tokens, 'https://api.twitter.com/1.1/account/verify_credentials.json', (body, response) ->
      response.statusCode

  exports.getUserInfo = (tokens) ->
    processGetRequest tokens, 'https://api.twitter.com/1.1/account/settings.json', (body) ->
      userInfo = JSON.parse body
      userName: userInfo.screen_name

  processGetRequest = (tokens, url, callback) ->
    new bluebird (fulfill, reject) ->
      headerParams =
        'oauth_consumer_key': APP_KEY
        'oauth_nonce': oAuthNonce()
        'oauth_signature_method': 'HMAC-SHA1'
        'oauth_timestamp': Math.round(new Date() / 1000)
        'oauth_token': tokens.oauth_token
        'oauth_version': '1.0'
      globalParams = headerParams
      headerParams.oauth_signature = getSignature globalParams, 'get', url, tokens.oauth_token_secret, APP_SECRET
      request
        uri: url
        headers:
          'Authorization': 'OAuth ' + inLineParams headerParams
        method: 'GET'
      , (error, response, body) ->
        if error
          reject error
        else
          fulfill callback body, response

bodyToTokens = (body) ->
  tokenArray = body.split '&'
  tokens = {}
  for token in tokenArray
    elems = token.split '='
    tokens[elems[0]] = elems[1]
  tokens

module.exports =
  getOAuthURL: getOAuthURL
  getTokens: getTokens
  createSignatureBaseString: createSignatureBaseString
  createSigningKey: createSigningKey
  createSignature: createSignature
  getAccessToken: getAccessToken
  postMessage: postMessage
  getTweets: getTweets
  getSignature: getSignature
  bodyToTokens: bodyToTokens
