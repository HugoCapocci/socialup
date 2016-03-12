###
# DROP BOX WEB API
# see https://www.dropbox.com/developers-v1/core/docs, https://dropbox.github.io/dropbox-api-v2-explorer/
###

DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY
DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET
DROPBOX_REDIRECT_URI = process.env.APP_URL + '/dropbox2callback'
END_POINT = 'api.dropboxapi.com'

https = require 'https'
Promise = require 'bluebird'
request = require 'request'
fs = require 'fs'
querystring = require 'querystring'

exports.pushCode = (code) ->

  deferred = Promise.pending()
  post_data = querystring.stringify
    'client_id': DROPBOX_APP_KEY
    'client_secret': DROPBOX_APP_SECRET
    'redirect_uri' : DROPBOX_REDIRECT_URI
    'grant_type' : 'authorization_code'
    'code' : code

  post_options =
    host: END_POINT
    port: 443
    path: '/1/oauth2/token'
    method: 'POST'
    headers:
      'Content-Type': 'application/x-www-form-urlencoded'
      'Content-Length': post_data.length

  post_req = https.request post_options, (res) ->
    res.setEncoding 'utf8'
    res.on 'data', (chunk) ->
      deferred.resolve JSON.parse(chunk)

  post_req.on 'error', (e) ->
    deferred.reject new Error(e)

  post_req.write post_data
  post_req.end()
  
  deferred.promise

exports.listFiles = (token, path, typeFilter) ->
    
  if path is undefined or path is 'root'
    path=''
  else
    path = decodeURI path
  retrieveAllFiles token, path, typeFilter

retrieveAllFiles = (token, path, typeFilter) ->
    
  deferred = Promise.pending()
  post_data =
    path: path
    recursive: false
    include_media_info: false

  request
    uri: 'https://'+END_POINT+'/2/files/list_folder'
    auth:
      bearer: token.access_token
    method: "POST"
    json: true
    body: post_data
  , (error, response, body) ->
    if error?
      deferred.reject error
    else
      results = []
      for entry in body.entries
        if typeFilter is 'folder'
          if entry['.tag'] is 'folder'
            results.push name : entry.name, id: entry.path_lower, mimeType : entry['.tag'],
            isFolder : entry['.tag'] is 'folder'
        #TODOfile type filter
        else
          results.push name : entry.name, id: entry.path_lower, mimeType : entry['.tag'],
          isFolder : entry['.tag'] is 'folder'

      deferred.resolve results

  deferred.promise

exports.getSpaceUsage = (tokens) ->
  
  deferred = Promise.pending()
  request
    uri: 'https://'+END_POINT+'/2/users/get_space_usage'
    auth:
      bearer: tokens.access_token
    method: "POST"
  , (error, response, body) ->
    if error?
      deferred.reject error
    else
      result = JSON.parse body
      deferred.resolve
        used : result.used
        total : result.allocation.allocated
        
  deferred.promise

exports.getFileMetaData = (tokens,filePath) ->

  processGetRequest tokens.access_token, 'https://content.dropboxapi.com/1/files/auto/'+encodeURIComponent(filePath),
  (fileContent, response) ->
    metaData = JSON.parse response.headers['x-dropbox-metadata']
    metaData.fileName = metaData.path.substring metaData.path.lastIndexOf('/')+1
    metaData

exports.downloadFile = (tokens,filePath) ->

  request
    uri: 'https://content.dropboxapi.com/1/files/auto/'+encodeURIComponent filePath
    auth:
      bearer: tokens.access_token
    method: "GET"

exports.deleteFile = (tokens,filePath) ->
 
  deferred = Promise.pending()
  request
    uri: 'https://api.dropboxapi.com/2/files/delete'
    auth:
      bearer: tokens.access_token
    headers :
      'Content-Type' : 'application/json'
    json : true
    body :
      path : '/'+filePath
    method: "POST"
  , (error, response, body) ->
  
    if error?
      deferred.reject error
    else
      deferred.resolve body

  deferred.promise

exports.uploadDrive = (tokens, file, path) ->
    
  deferred = Promise.pending()
  url='https://content.dropboxapi.com/1/files_put/auto'
  if path? then url+=encodeURIComponent path
  url+='/'+file.originalname

  request
    uri : url
    auth:
      bearer: tokens.access_token
    method: "POST"
    body: fs.readFileSync file.path
  , (error, response, body) ->

    if error?
      deferred.reject error
    else
      results =
        url : 'https://www.dropbox.com/home/Camera%C2%A0Uploads?preview='+file.originalname
      deferred.resolve results
  deferred.promise

exports.getOAuthURL = ->
  'https://www.dropbox.com/1/oauth2/authorize?client_id='+DROPBOX_APP_KEY+'&redirect_uri='+
  DROPBOX_REDIRECT_URI+'&response_type=code'

getUserInfo = (tokens) ->

  processGetRequest tokens.access_token, 'https://'+END_POINT+'/1/account/info', (userInfo) ->
    userName:JSON.parse(userInfo).display_name

processGetRequest = (access_token, url, callback) ->

  deferred = Promise.pending()
  request
    uri: url
    auth:
      bearer: access_token
    method: "GET"
  , (error, response, body) ->
    if error?
      deferred.reject error
    else
      deferred.resolve callback(body, response)

  deferred.promise

exports.createShareLink = (tokens, filePath) ->

  deferred = Promise.pending()
  request
    uri: 'api.dropboxapi.com/2/sharing/create_shared_link'
    auth:
      bearer: tokens.access_token
    json: true
    form :
      path : encodeURIComponent '/'+filePath
    method: "POST"
  , (error, response, body) ->
    console.log "createShareLink response: ", response
    if error?
      deferred.reject error
    else
      deferred.resolve JSON.parse(body).url

  deferred.promise
