###
# TWITTER WEB API
# see https://dev.twitter.com/rest/public
###
https = require 'https'
http = require 'http'
request = require 'request'
bluebird = require 'bluebird'
fs = require 'fs'
querystring = require 'querystring'
oAuthNonce = require './oauth_nonce'
crypto = require 'crypto'
APP_KEY = process.env.TWITTER_APP_KEY
APP_SECRET = process.env.TWITTER_APP_SECRET
REDIRECT_URL = process.env.APP_URL + '/twitter2callback?state='
TOKEN = process.env.TWITTER_ACCESS_TOKEN
TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET

applicationOnlyToken = null

getOAuthURL = -> 'https://api.twitter.com/oauth/authorize'

#request a token by post
getTokens = (userId) ->
  new bluebird (fulfill, reject) ->
    tokens =
      oauth_token: TOKEN
      oauth_token_secret: TOKEN_SECRET
    url = 'https://api.twitter.com/oauth/request_token'
    request
      uri: url
      headers: processHeader tokens, url, 'post', REDIRECT_URL + userId
      method: 'POST'
    ,(error, response, body) ->
      if error
        reject error
      else
        fulfill bodyToTokens body

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
    url = 'https://api.twitter.com/oauth/access_token'
    tokens =
      oauth_token: tokens.oauth_token
      oauth_token_secret: tokens.oauth_token_secret or TOKEN_SECRET
    request
      uri: url
      headers: processHeader tokens, url, 'post'
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
    url = 'https://api.twitter.com/1.1/statuses/update.json'
    request
      uri: url
      headers: processHeader tokens, url, 'post'
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
  url = 'https://api.twitter.com/1.1/statuses/user_timeline.json'
  request
    uri: url + '?user_id=' + tokens.user_id
    headers: processHeader tokens, url, 'get'
    method: 'GET'
  , (error, response, body) ->
    if error
      resolver.reject error
    else
      resolver.resolve response
  resolver.promise

#return 200 if token is valid
exports.verifyCredentials = (tokens) ->
  processGetRequest tokens, 'https://api.twitter.com/1.1/account/verify_credentials.json', (body, response) ->
    response.statusCode

exports.getUserInfo = (tokens) ->
  processGetRequest tokens, 'https://api.twitter.com/1.1/account/settings.json', (body) ->
    userInfo = JSON.parse body
    userName: userInfo.screen_name

processHeader = ({oauth_token, oauth_token_secret}, url, httpVerb, oauthCallback) ->
  console.log 'process header'
  return 'Authorization': 'Bearer ' + applicationOnlyToken?.access_token unless tokens?
  headerParams =
    'oauth_consumer_key': APP_KEY
    'oauth_nonce': oAuthNonce()
    'oauth_signature_method': 'HMAC-SHA1'
    'oauth_timestamp': Math.round new Date() / 1000
    'oauth_token': oauth_token
    'oauth_version': '1.0'
  headerParams['oauth_callback'] = oauthCallback if oauthCallback?
  globalParams = headerParams
  headerParams.oauth_signature = getSignature globalParams, httpVerb, url, oauth_token_secret, APP_SECRET
  'Authorization': 'OAuth ' + inLineParams headerParams

processGetRequest = (tokens, url, callback) ->
  request
    uri: url
    headers: processHeader tokens, url, 'get'
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

getEncodedBearedTokenCredentials = (consumerKey = APP_KEY, consumerSecret = APP_SECRET) ->
  bearedTokenCredentials = encodeURIComponent(consumerKey) + ':' + encodeURIComponent(consumerSecret)
  new Buffer(bearedTokenCredentials).toString 'base64'

getApplicationOnlyToken = ->
  encodedBearedTokenCredentials = getEncodedBearedTokenCredentials()
  new bluebird (fulfill, reject) ->
    url = 'https://api.twitter.com/oauth2/token'
    request
      uri: url
      headers:
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        'Authorization': 'Basic ' + encodedBearedTokenCredentials
      method: 'POST'
      form: 'grant_type': 'client_credentials'
    , (error, response, body) ->
      if error
        reject error
      else
        fulfill body

getApplicationOnlyToken()
.then (token) ->
  console.log 'twitter getApplicationOnlyToken success, token: ', token
  applicationOnlyToken = token
.catch (error) ->
  console.log 'twitter getApplicationOnlyToken failure, error: ', error

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
  _getEncodedBearedTokenCredentials: getEncodedBearedTokenCredentials
