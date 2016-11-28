###
# VIMEO WEB API
#  see https://developer.vimeo.com/api/
###
Q = require('q')
request = require('request')
https = require('https')
fs = require('fs')
CLIENT_ID = process.env.VIMEO_CLIENT_ID
CLIENT_SECRET = process.env.VIMEO_CLIENT_SECRET
REDIRECT_URL = process.env.APP_URL + '/vimeo2callback'
DESCRIPTION_MAX_LENGTH = 1250
unauthenticatedToken = null

exports.getOAuthURL = ->
  "https://api.vimeo.com/oauth/authorize?response_type=code&client_id=#{CLIENT_ID}&redirect_uri=#{REDIRECT_URL}" +
  '&scope=' + encodeURI 'public private purchased create edit delete upload interact'

exports.pushCode = (code, userId) ->
  deferred = Q.defer()
  request
    method: 'POST'
    uri: 'https://api.vimeo.com/oauth/access_token'
    auth:
      user: CLIENT_ID
      pass: CLIENT_SECRET
    form:
      grant_type: 'authorization_code'
      redirect_uri: REDIRECT_URL
      code: code
  , (err, response, body) ->
    if err
      console.log 'Err: ', err
      deferred.reject err
    else
      results = JSON.parse body
      if results.error
        deferred.reject results
      else
        deferred.resolve results

  deferred.promise

getUnauthenticatedToken = ->
  deferred = Q.defer()
  request
    method: 'POST'
    uri: 'http://api.vimeo.com/oauth/authorize/client'
    auth:
      user: CLIENT_ID
      pass: CLIENT_SECRET
    form:
      grant_type: 'client_credentials'
      redirect_uri: REDIRECT_URL
  , (err, response, body) ->

    if err
      console.log 'Err: ', err
      deferred.reject err
    else
      results = JSON.parse body
      console.log 'VimeoUnauthenticatedToken? ', results?.access_token
      if results.error
        deferred.reject results
      else
        unauthenticatedToken = results
        deferred.resolve results
  deferred.promise

exports.getUserInfo = (tokens) ->
  deferred = Q.defer()
  userInfo =
    userName: tokens.user.name
  delete tokens.user
  deferred.resolve userInfo
  deferred.promise

exports.listMedia = (tokens) ->
  processGetRequest tokens.access_token, '/me/videos', (response) ->
    counts =
      view: 0
      comment: 0
      like: 0
    getStat = (name) ->
      name: name, value: counts[name]

    medias =
      list: response.data.map (video) ->
        video.id = video.uri.substr video.uri.lastIndexOf('/') + 1
        video.title = video.name
        video.thumbnailURL = video.pictures.sizes[0].link
        video.creationDate = video.created_time
        counts.view += video.stats.plays
        counts.comment += video.metadata.connections.comments.total
        counts.like += video.metadata.connections.likes.total
        video.counts =
          view: video.stats.plays
          comment: video.metadata.connections.comments.total
          like: video.metadata.connections.likes.total
        delete video.stats
        delete video.metadata.connections
        video
      stats: [
        getStat 'view'
        getStat 'comment'
        getStat 'like'
      ]

exports.searchVideo = (videoName, limit, order, page) ->
  url = '/videos?query=' + encodeURI(videoName) + '&per_page=' + limit
  if page
    url += '&page=' + page
  sort = processOrder(order)
  url += '&sort=' + sort

  processGetRequest unauthenticatedToken.access_token, url, (response) ->
    result =
      videos: response.data.map (result) ->
        video = {}
        video.id = result.uri.substr result.uri.lastIndexOf('/') + 1
        video.title = result.name
        video.thumbnailURL = result.pictures.sizes[0].link
        video.creationDate = result.created_time
        if result.description and result.description.length > DESCRIPTION_MAX_LENGTH
          video.description = result.description.substr(0, DESCRIPTION_MAX_LENGTH)
        else
          video.description = result.description
        video.duration = result.duration
        video.channel = result.user.name
        video.channelURL = result.user.link
        video.counts =
          view: result.stats.plays
          comment: result.metadata.connections.comments.total
          like: result.metadata.connections.likes.total
        video

      totalResults:  response.total
      next: response.next
      previous: response.previous
      first: response.first
      last: response.last
      page: response.page

processOrder = (order) ->
  switch (order)
    when 'date'
      'date'
    when 'rating'
      'likes'
    when 'relevance'
      'relevant'
    when 'viewCount'
      'plays'
    else
      undefined

#see https://developer.vimeo.com/api/upload/videos
exports.sendVideo = (tokens, file, userId, params, providerOptions) ->
  deferred = Q.defer()
  uploadLink = null
  completeURI = null
  videoId = null
  generateUploadTicket(tokens).then (ticket) ->
    console.log 'upload to ' + ticket.upload_link_secure
    uploadLink = ticket.upload_link_secure
    completeURI = ticket.complete_uri
    publishVideo ticket.upload_link_secure, tokens, file
  .then  ->
    verifyUpload uploadLink, tokens
  .then ->
    finalizeUpload completeURI, tokens
  .then (id) ->
    videoId = id
    console.log "finalizeUpload videoId: #{videoId}"
    patchMetadata tokens, videoId, params.title, params.description, providerOptions
  .then ->
    #tags
    #if(params.tags)
    #PUT https://api.vimeo.com/videos/{video_id}/tags/{word}
    deferred.resolve url: 'https://vimeo.com/' + videoId
  .catch (err) ->
    deferred.reject err

  deferred.promise

generateUploadTicket = (tokens) ->
  deferred = Q.defer()
  request
    method: 'POST'
    uri: 'https://api.vimeo.com/me/videos'
    auth: bearer: tokens.access_token
    form: type: 'streaming'
  , (err, response, body) ->

    if err
      deferred.reject(err)
    else
      results = JSON.parse body
      if results.error
        deferred.reject results
      else
        deferred.resolve results

  deferred.promise

publishVideo = (uploadLink, tokens, file) ->
  deferred = Q.defer()
  stat = fs.statSync file.path
  request
    method: 'PUT'
    uri: uploadLink
    auth: bearer: tokens.access_token
    headers:
      'Content-Length': stat.size
      'Content-Type': 'video/mp4'
    body: fs.readFileSync(file.path)
  , (err, response, body) ->

    if err
      console.log 'cannot publish the video. Err: ', err
      deferred.reject err
    else
      results = JSON.parse body
      console.log 'publishVideo statusCode ?', response.statusCode
      if body.error
        deferred.reject body.error
      else
        deferred.resolve body

  deferred.promise

verifyUpload = (uploadLink, tokens) ->

  deferred = Q.defer()
  request
    method: 'PUT'
    uri:  uploadLink
    auth: bearer: tokens.access_token
    headers: 'Content-Range': 'bytes */*'
  ,(err, response, body) ->
    if err
      console.log 'cannot verifyUpload. Err: ',err
      deferred.reject err
    else
      console.log 'verifyUpload statusCode ?', response.statusCode
      console.log "headers range: #{response.headers.range}"
      if body.error
        deferred.reject body.error
      else
        deferred.resolve body
  deferred.promise

finalizeUpload = (completeURI, tokens) ->

  console.log "completeURI? #{completeURI}"
  deferred = Q.defer()
  request
    method: 'DELETE'
    uri: "https://api.vimeo.com#{completeURI}"
    auth: bearer: tokens.access_token
  , (err, response, body) ->

    if err
      console.log 'cannot finalizeUpload. Err: ', err
      deferred.reject err
    else
      if response.statusCode isnt 201
        deferred.reject body.error
      else
        location = response.headers.location
        deferred.resolve location.substr location.lastIndexOf('/') + 1

  deferred.promise

patchMetadata = (tokens, videoId, title, description, providerOptions) ->

  console.log 'vimeo patchMetadata providerOptions', providerOptions
  deferred = Q.defer()
  request
    method: 'PATCH'
    json: true
    uri: "https://api.vimeo.com/videos/#{videoId}"
    auth:
      bearer: tokens.access_token
    body:
      name: title
      description: description
      privacy:
        view: providerOptions.privacyStatus
  , (err, response, body) ->
    if err
      console.log "cannot patchMetadata. Err: #{err}"
      deferred.reject err
    else
      console.log 'patchMetadata statusCode ?', response.statusCode
      if body.error
        deferred.reject body.error
      else
        deferred.resolve()
  deferred.promise

processGetRequest = (access_token, path, callback) ->
  deferred = Q.defer()
  req_options =
    host: 'api.vimeo.com'
    port: 443
    path: path
    method: 'GET'
    headers: 'Authorization': "Bearer #{access_token}"
  req = https.request req_options, (res) ->
    data = ''
    res.on 'data', (chunk) ->
      data += chunk
    res.on 'end', ->
      deferred.resolve callback JSON.parse data

  req.on 'error', (err) ->
    deferred.reject err
  req.end()
  deferred.promise

#onload
getUnauthenticatedToken()
