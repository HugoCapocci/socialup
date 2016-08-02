###
# FACEBOOK WEB API
# see https://developers.facebook.com/docs/graph-api/using-graph-api/v2.5
###

APP_ID = process.env.FACEBOOK_APP_ID
APP_SECRET = process.env.FACEBOOK_APP_SECRET
REDIRECT_URI = process.env.APP_URL + '/facebook2callback'
querystring = require 'querystring'
https = require 'https'
Q = require 'q'
request = require 'request'
fs = require 'fs'
userDAO = require '../userDAO'
moment = require 'moment'
appToken = null

exports.pushCode = (code) ->
  deferred = Q.defer()
  req_options =
    host: 'graph.facebook.com'
    port: 443
    path: '/v2.3/oauth/access_token?client_id=' + APP_ID + '&redirect_uri=' + REDIRECT_URI + '&client_secret=' +
    APP_SECRET + '&code=' + code
    method: 'GET'

  req = https.request req_options, (res) ->
    data = ''
    res.on 'data', (chunk) ->
      data += chunk
    res.on 'end', ->
      console.log 'code validated ? ', data
      deferred.resolve JSON.parse data

  req.on 'error', (error) ->
    console.log 'FB authentication error: ', error
    deferred.reject error

  req.end()
  deferred.promise

exports.refreshTokens = (tokens, userId) ->
  deferred = Q.defer()
  req_options =
    host: 'graph.facebook.com'
    port: 443
    path: '/v2.3/oauth/access_token?grant_type=fb_exchange_token&client_id=' + APP_ID + '&redirect_uri=' +
      REDIRECT_URI + '&client_secret=' + APP_SECRET + '&fb_exchange_token=' + tokens.access_token
    method: 'GET'

  req = https.request req_options, (res) ->
    data = ''
    res.on 'data', (chunk) ->
      data += chunk
    res.on 'end', ->
      console.log 'code validated ? ', data
      refreshedToken = JSON.parse data
      deferred.resolve saveTokensForUser refreshedToken, userId

  req.on 'error', (e) ->
    console.log 'upload url error: ', e
    deferred.reject e

  req.end()
  deferred.promise

saveTokensForUser = (tokens, userId) ->
  tokens.expiry_date = Date.now() + tokens.expires_in
  delete tokens.expires_in
  userDAO.updateUserTokens userId, 'facebook', tokens
  tokens

tagsAsHashtags = (tags) ->
  if tags is undefined
    return ''
  hastags = '\n\n'
  for tag in tags
    hastags += "##{tags}"
  hastags

exports.getUserGroups = (tokens) ->
  processGetRequest tokens.access_token, '/me/groups', (groupsData) ->
    groupsData.data

exports.getUserEvents = (tokens, sinceDate, untilDate) ->
  #TODO add parameter 'type' (attending, created, declined, maybe, not_replied) in order to filter events
  sinceDate = moment(parseInt(sinceDate)).unix()
  untilDate = moment(parseInt(untilDate)).unix()
  processGetRequest tokens.access_token, "/me/events?limit=100&since=#{sinceDate}&until=#{untilDate}", (events) ->
    events.data

exports.sendVideo = (token, file, user, params, providerOptions) ->
  #TODO use providerOptions to choose between profil and group
  #and set visibility
  deferred = Q.defer()
  #current user by default
  targetId = 'me'

  if providerOptions.group
    targetId = providerOptions.group.id

  formData =
    access_token: token.access_token
    source: fs.createReadStream(file.path)
    title: params.title
    description: params.description + tagsAsHashtags(params.tags)

  console.log 'providerOptions? ', providerOptions
  if providerOptions is undefined
    formData['privacy.value'] = 'SELF'
  else
    formData['privacy.value'] = providerOptions.visibility

  request
    method: 'POST'
    uri: 'https://graph-video.facebook.com/v2.5/' + targetId + '/videos'
    formData: formData
  , (err, response, body) ->
    if err
      deferred.reject err
    else
      console.log 'FB Video Upload Response body: ', body
      videoId = JSON.parse(body).id
      deferred.resolve url: 'https://www.facebook.com/' + videoId
  deferred.promise

#/v2.5/{video-id}
exports.getVideoData = (videoId, tokens) ->
  processGetRequest tokens.access_token, '/' + videoId + '/thumbnails', (videoData) ->
    videoData

#https://developers.facebook.com/docs/facebook-login/permissions
exports.getOAuthURL = ->
  'https://graph.facebook.com/oauth/authorize?client_id=' + APP_ID + '&redirect_uri=' + REDIRECT_URI +
  '&scope=public_profile +publish_actions+user_posts+user_managed_groups+manage_pages+read_insights+user_events'

exports.postMessage = (tokens, message, providerOptions) ->
  publishOnFeed tokens, message: message, providerOptions

exports.postMediaLink = (tokens, message, url, title, description, providerOptions ) ->
  publishOnFeed tokens
  message: message, link: url, name: title, caption: description, description: description
  providerOptions

publishOnFeed = (tokens, data, providerOptions) ->
  data.access_token = tokens.access_token
  if providerOptions is undefined
    data['privacy.value'] = 'SELF'
  else
    data['privacy.value'] = providerOptions.visibility

  deferred = Q.defer()
  request
    method: 'POST'
    uri: 'https://graph.facebook.com/me/feed'
    json: true
    body: data
  , (err, response, body) ->
    if err
      deferred.reject err
    else
      console.log 'publishOnFeed response body: ', body
      id = body.id
      #TODO fix hardcoded url
      body.url = 'https://www.facebook.com/yug357/posts/' + id.split('_')[1]
      deferred.resolve body
  deferred.promise

exports.getPages = (tokens) ->
  processGetRequest tokens.access_token, '/me/accounts?locale=fr_FR', (pages) ->
    console.log 'Facebook users pages: ', pages.data
    pages.data

#TODO get events (created by user / where user is admin)
# https://developers.facebook.com/docs/graph-api/reference/user/promotable_events/

exports.getUserInfo = (tokens) ->
  processGetRequest tokens.access_token, '/me', (userInfo) ->
    return userName: userInfo.name

processGetRequest = (access_token, path, callback, isOldPath) ->
  deferred = Q.defer()
  req_options =
    host: 'graph.facebook.com'
    port: 443
    path: if isOldPath then path else '/v2.5' + path
    method: 'GET'

  if access_token
    req_options.headers = 'Authorization': 'Bearer ' + access_token
  else
    req_options.headers = 'Authorization': 'Bearer ' + appToken.access_token

  req = https.request req_options, (res) ->
    data = ''
    res.on 'data', (chunk) ->
      data += chunk
    res.on 'end', ->
      deferred.resolve callback JSON.parse data

  req.on 'error', (e) ->
    console.log 'processRequest error: ', e
    deferred.reject e

  req.end()
  deferred.promise

# see https://developers.facebook.com/docs/graph-api/using-graph-api
# & https://developers.facebook.com/docs/graph-api/reference/page
exports.searchPage = (tokens, pageName) ->
  search (if tokens isnt undefined then tokens.access_token else undefined), pageName, 'page',
  'id,name,category,picture,about,likes'

search = (access_token, query, searchType, fields) ->
  url = '/search?q=' + encodeURI(query) + "&type=#{searchType}&fields=#{fields}&locale=fr_FR"
  if not access_token
    url += '&access_token=' + appToken.access_token

  processGetRequest access_token, url, (elements) ->
    if searchType isnt 'page'
      elements.data
    else
      elements.data.map (page) ->
        page.thumbnailURL = page.picture.data.url
        page.description = page.about
        delete page.picture
        delete page.about
        page
  , true

#see https://developers.facebook.com/docs/graph-api/reference/v2.5/insights
exports.getPageMetrics = (tokens, metricType, pageId, sinceDate, untilDate) ->
  #TODO : cut by periods of 93 days if request duration is too long
  processGetRequest (if tokens isnt undefined then tokens.access_token else undefined),
    "/#{pageId}/insights?metric=#{metricType}&since=#{sinceDate}&until=#{untilDate}", (metrics) ->
    metrics.data

getAppToken = ->
  deferred = Q.defer()
  req_options =
    host: 'graph.facebook.com'
    port: 443
    path: "/v2.3/oauth/access_token?client_id=#{APP_ID}&grant_type=client_credentials&client_secret=#{APP_SECRET}"
    method: 'GET'

  req = https.request req_options, (res) ->
    data = ''
    res.on 'data', (chunk) -> data += chunk

    res.on 'end', ->
      results = JSON.parse(data)
      appToken = results
      if appToken.error
        console.log 'FB getAppToken error: ', appToken
        return deferred.reject appToken
      console.log 'appToken? ', appToken
      deferred.resolve results

  req.on 'error', (e) ->
    console.log 'FB getAppToken error: ', e
    deferred.reject e

  req.end()
  deferred.promise

#getAppToken()
