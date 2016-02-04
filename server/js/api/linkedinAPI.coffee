###
# LINKED IN WEB API
# see https://developer.linkedin.com/docs
###
https = require('https')
http = require('http')
request = require('request')
Q = require('q')
fs = require('fs')
querystring = require('querystring')
CLIENT_ID = process.env.LINKEDIN_CLIENT_ID
CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET
REDIRECT_URI = process.env.APP_URL + '/linkedin2callback'

#see https://developer.linkedin.com/docs/oauth2
getOAuthURL = ->
  'https://www.linkedin.com/uas/oauth2/authorization?response_type=code&client_id='+CLIENT_ID+'&redirect_uri='+
  REDIRECT_URI

pushCode = (code) ->

  deferred = Q.defer()
  #ask for token
  post_data = querystring.stringify
    'client_id': CLIENT_ID
    'client_secret': CLIENT_SECRET
    'redirect_uri' : REDIRECT_URI
    'grant_type' : 'authorization_code'
    'code' : code

  post_options =
    host: 'www.linkedin.com'
    port: 443
    path: '/uas/oauth2/accessToken'
    method: 'POST'
    headers:
      'Content-Type': 'application/x-www-form-urlencoded'
      'Content-Length': post_data.length

  post_req = https.request post_options, (res) ->
    res.setEncoding('utf8')
    res.on 'data', (chunk) ->
      deferred.resolve JSON.parse(chunk)

  post_req.on 'error', (e) ->
    deferred.reject new Error(e)

  #post the data
  post_req.write(post_data)
  post_req.end()

  deferred.promise

getUserInfo = (tokens) ->

  deferred = Q.defer()
  req_options =
    host: 'api.linkedin.com'
    port: 443
    path: '/v1/people/~?format=json'
    method: 'GET'
    headers:
      'Authorization': 'Bearer '+tokens.access_token

  req = https.request req_options, (res) ->
    data=''
    res.on 'data', (chunk) ->
      data+=chunk
    res.on 'end', ->
      userInfo = JSON.parse(data)
      deferred.resolve({userName:userInfo.firstName+' '+userInfo.lastName})

  req.on 'error', (e) ->
    console.log('get user infos error: ', e)
    deferred.reject new Error(e)

  req.end()
  deferred.promise

postMessage = (tokens, message) ->

  deferred = Q.defer()
  post_data =
    comment: message
    visibility:
      code: 'anyone'

  request
    uri: 'https://api.linkedin.com/v1/people/~/shares?format=json'
    auth:
      bearer: tokens.access_token
    method: 'POST'
    json: true
    body: post_data
  ,(error, response, body) ->
    if error
      deferred.reject new Error(error)
    else
      if body.status is 400
        deferred.reject new Error(body.message)
      else
        deferred.resolve(body)

  deferred.promise

exports.getOAuthURL=getOAuthURL
exports.pushCode=pushCode
exports.getUserInfo=getUserInfo
exports.postMessage=postMessage