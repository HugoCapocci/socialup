###
# DAILYMOTION WEB API
# see https://developer.dailymotion.com/api
# https://developer.dailymotion.com/tools/apiexplorer
###
https = require 'https'
http = require 'http'
request = require 'request'
Promise = require 'bluebird'
fs = require 'fs'
querystring = require 'querystring'
userDAO = require '../userDAO'

DAILYMOTION_API_KEY = process.env.DAILYMOTION_API_KEY
DAILYMOTION_API_SECRET = process.env.DAILYMOTION_API_SECRET
DAILYMOTION_REDIRECT_URL = process.env.APP_URL + '/dailymotion2callback'
DESCRIPTION_MAX_LENGTH = 800

getOAuthURL = ->
  "https://www.dailymotion.com/oauth/authorize?response_type=code&client_id=#{DAILYMOTION_API_KEY}&redirect_uri=" +
  "#{DAILYMOTION_REDIRECT_URL}&scope=userinfo+email+manage_videos+manage_playlists"

pushCode = (code, userId) ->

  deferred = Promise.pending()
  #ask for token
  post_data = querystring.stringify
    'grant_type': 'authorization_code'
    'client_id': DAILYMOTION_API_KEY
    'client_secret': DAILYMOTION_API_SECRET
    'redirect_uri': DAILYMOTION_REDIRECT_URL
    'code': code

  post_options =
    host: 'api.dailymotion.com'
    port: 443
    path: '/oauth/token'
    method: 'POST'
    headers:
      'Content-Type': 'application/x-www-form-urlencoded'
      'Content-Length': post_data.length

  post_req = https.request post_options, (res) ->
    res.setEncoding 'utf8'
    res.on 'data', (chunk) ->
      tokens = JSON.parse chunk
      deferred.resolve saveTokensForUser tokens, userId

  post_req.on 'error', (e) ->
    deferred.reject new Error(e)

  post_req.write post_data
  post_req.end()

  deferred.promise

saveTokensForUser = (tokens, userId) ->
  tokens.expiry_date = Date.now() + tokens.expires_in
  delete tokens.expires_in
  tokens

checkAccessTokenValidity = (tokens, userId) ->
  deferred = Promise.pending()
  if tokens.expiry_date <= Date.now()
    console.log 'refresh dailymotion oauth token '
    return refreshTokens tokens, userId
  else
    deferred.resolve tokens
    return deferred.promise

# see https://developer.dailymotion.com/api#using-refresh-tokens
refreshTokens = (tokens, userId) ->
  deferred = Promise.pending()
  post_data = querystring.stringify
    'grant_type': 'refresh_token'
    'client_id': DAILYMOTION_API_KEY
    'client_secret': DAILYMOTION_API_SECRET
    'refresh_token': tokens.refresh_token

  post_options =
    host: 'api.dailymotion.com'
    port: 443
    path: '/oauth/token'
    method: 'POST'
    headers:
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length

  post_req = https.request post_options, (res) ->
    res.setEncoding 'utf8'
    res.on 'data', (chunk) ->
      tokens = JSON.parse chunk
      #TODO save refreshed token
      deferred.resolve saveTokensForUser(tokens, userId)

  post_req.on 'error', (e) ->
    deferred.reject new Error(e)

  post_req.write post_data
  post_req.end()

  deferred.promise

listMedia = (tokens) ->

  processGetRequest tokens.access_token,
  '/user/me/videos?fields=id,thumbnail_60_url,title,description,status,created_time,views_total,comments_total',
  (videos) ->
    counts =
      view:0
      comment:0
    getStat = (name) ->
      name: name
      value: counts[name]
    videoList = videos.list.map (video) ->
      video.thumbnailURL = video.thumbnail_60_url
      video.creationDate = new Date video.created_time * 1000
      delete video.thumbnail_60_url
      delete video.created_time
      counts.view += video.views_total
      counts.comment += video.comments_total
      video.counts =
        view: video.views_total
        comment: video.comments_total
      delete video.views_total
      delete video.comments_total
      video

    list: videoList
    stats: [
      getStat 'view'
      getStat 'comment'
    ]

searchVideo = (videoName, limit, order, page, oAuthToken) ->

  console.log 'dailymotion searchVideo oAuthToken? ', oAuthToken
  fields = 'id,thumbnail_120_url,title,description,status,created_time,views_total' +
  ',comments_total,owner.username,duration'
  sort = processOrder order
  url = '/videos?fields=' + fields + '&search=' + encodeURI(videoName) + '&limit=' + limit
  if sort? then  url += '&sort=' + sort
  if page? then url += '&page=' + page

  processGetRequest oAuthToken, url, (results) ->
    console.log 'dailymotion searchVideo results.error? ', results.error
    return Promise.reject results.error if results.error
    videos : results.list?.map (video) ->
      #FIXME html issue ?
      if video.description?.length > DESCRIPTION_MAX_LENGTH
        video.description = video.description.substr(0, DESCRIPTION_MAX_LENGTH) + ' ...'
      video.thumbnailURL = video.thumbnail_120_url
      video.creationDate = new Date video.created_time * 1000
      video.counts =
        view: video.views_total
        comment: video.comments_total
      video.channel = video['owner.username']
      video.channelURL = 'http://www.dailymotion.com/' + video['owner.username']
      delete video['owner.username']
      delete video.views_total
      delete video.comments_total
      delete video.thumbnail_120_url
      delete video.created_time
      video
    totalResults:  results.total
    has_more: results.has_more
    page: results.page

processOrder = (order) ->
  switch(order)
    when 'date'
      return 'recent'
    when 'rating'
      return 'trending'
    when 'relevance'
      return 'relevance'
    when 'viewCount'
      return 'visited'
    else
      return undefined

sendVideo = (tokens, file, userId, params, providerOptions) ->
  getUploadURL tokens
  .then (urls) ->
    request
      method: 'POST'
      uri: urls.upload_url
      auth:
        bearer: tokens.access_token
      formData:
        file: fs.createReadStream file.path
    , (error, response, body) ->
      if error?
        Promise.reject error
      else
        videoURL = JSON.parse(body).url
        Promise.resolve publishVideo videoURL, tokens, params, providerOptions

# see https://developer.dailymotion.com/api#video-upload
publishVideo = (videoURL, tokens, params, providerOptions) ->
  new Promise (resolve, reject) ->
    request
      method: 'POST'
      uri:  'https://api.dailymotion.com/me/videos'
      auth:
        bearer: tokens.access_token
      form:
        url: videoURL
        title: params.title
        channel: providerOptions.channel.id
        description: params.description
        tags: params.tags
        published: true
        private: if providerOptions.private? then providerOptions.private else false
    , (error, response, body) ->
      if error?
        console.log 'cannot publish the video. Err: ',error
        reject new Error error
      else
        results = JSON.parse body
        if results.error?
          reject new Error results.error.message
        else
          resolve
            url: 'http://www.dailymotion.com/video/' + results.id +
            '_' + results.title + '_' + results.channel
            thumbnail: 'http://www.dailymotion.com/thumbnail/video/' + results.id

getUploadURL = (tokens) ->
  processGetRequest tokens.access_token, '/file/upload'

getUserInfo = (tokens) ->
  processGetRequest tokens.access_token, '/user/me?fields=id,screenname,email', (userInfo) ->
    userName: userInfo.screename

listCategories = (tokens, userId) ->
  checkAccessTokenValidity tokens, userId
  .then (validTokens) ->
    processGetRequest validTokens.access_token, '/channels', (results) ->
      results.list.map (channel) ->
        channel.description
        channel

processGetRequest = (access_token, path, callback) ->
  new Promise (resolve, reject) ->
    req_options =
      host: 'api.dailymotion.com'
      port: 443
      path: path
      method: 'GET'

    req_options.headers = 'Authorization': 'Bearer ' + access_token if access_token?
    req = https.request req_options, (res) ->
      data = ''
      res.on 'data', (chunk) ->
        data += chunk
      res.on 'end', ->
        if callback?
          resolve callback JSON.parse data
        else
          resolve JSON.parse data

    req.on 'error', (error) ->
      reject error
    req.end()

module.exports =
  getOAuthURL: getOAuthURL
  pushCode: pushCode
  getUserInfo: getUserInfo
  listMedia: listMedia
  searchVideo: searchVideo
  refreshTokens: refreshTokens
  listCategories: listCategories
  sendVideo: sendVideo
