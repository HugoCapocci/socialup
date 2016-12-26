###
# Google WEB API
# Youtube see https://developers.google.com/youtube/v3/
# GoogeDrive see https://developers.google.com/drive/web/about-sdk
# Google+ see https://developers.google.com/+/domains/getting-started
#
# TODO check tokens.expiry_date and update user data in database
# if needed with refreshed tokens (automatically refresh by googleAPI)
###
_ = require 'lodash'
googleAPI = require 'googleapis'
Q = require 'q'
Promise = require 'bluebird'
fs = require 'fs'
userDAO = require '../userDAO'
moment = require 'moment'
GOOGLE_API_ID = process.env.GOOGLE_API_ID
GOOGLE_API_SECRET = process.env.GOOGLE_API_SECRET
GOOGLE_REDIRECT_URL = process.env.APP_URL + '/google2callback'
API_KEY = process.env.GOOGLE_API_KEY
FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
OAuth2 = googleAPI.auth.OAuth2
oauth2Client = new OAuth2 GOOGLE_API_ID, GOOGLE_API_SECRET, GOOGLE_REDIRECT_URL
youtubeAPI = googleAPI.youtube version: 'v3', auth: oauth2Client
drive = googleAPI.drive version: 'v2', auth: oauth2Client
googlePlus = googleAPI.plus version: 'v1', auth: oauth2Client
calendar = googleAPI.calendar version: 'v3', auth: oauth2Client

#generate url for OAuth authentication URI
getOAuthURL = ->
  URL = 'https://www.googleapis.com/auth/'
  #generate a url that asks permissions for Google+ and Google Calendar scopes
  scopes = [
    URL + 'youtube'
    URL + 'youtube.readonly'
    URL + 'youtube.upload'
    URL + 'youtubepartner'
    URL + 'youtube.force-ssl'
    URL + 'drive'
    URL + 'plus.me'
    URL + 'plus.stream.write'
    URL + 'calendar'
  ]
  url = oauth2Client.generateAuthUrl
    access_type: 'offline'
    scope: scopes

pushCode = (code) ->
  console.log 'google pushCode'
  deferred = Q.defer()
  #ask for token
  oauth2Client.getToken code, (error, tokens) ->
    # Now tokens contains an access_token and an optional refresh_token. Save them.
    unless error
      oauth2Client.setCredentials tokens
      deferred.resolve tokens
    else
      console.log 'unable to set credentials, error: ', error
      deferred.reject error
  deferred.promise

refreshTokens = (tokens, userId) ->
  deferred = Q.defer()
  credentials = access_token: tokens.access_token

  if tokens.refresh_token? then credentials.refresh_token = tokens.refresh_token
  oauth2Client.setCredentials credentials
  oauth2Client.refreshAccessToken (error, tokens) ->
    unless error
      oauth2Client.setCredentials tokens
      deferred.resolve okens
    else
    console.log 'unable to refresh credentials, error: ', error
    deferred.reject error

  deferred.promise

listCategories = (tokens) ->
  oauth2Client.setCredentials tokens
  deferred = Q.defer()
  youtubeAPI.videoCategories.list {part: 'snippet', regionCode: 'fr', hl: 'fr_FR'}, (error, response) ->
    if error
      deferred.reject error
    else
      categories = []
      for item in response.items
        if item.snippet.assignable
          categories.push
            id: item.id
            name: item.snippet.title
      deferred.resolve categories

  deferred.promise

#see https://developers.google.com/youtube/v3/docs/search/list#forMine
listMedia = (tokens, userId) ->
  console.log 'listMedia'
  oauth2Client.setCredentials tokens
  deferred = Q.defer()
  videoIDs = []
  youtubeAPI.search.list {part: 'snippet', forMine: true, type: 'video'}, (error, response) ->
    if error
      deferred.reject error
    else
      videos = []
      counts =
        view: 0
        like: 0
        dislike: 0
        favorite: 0
        comment: 0
      getStat = (name) -> name: name, value: counts[name]

      for item in response.items
        videoIDs.push item.id.videoId
        videos.push
          id: item.id.videoId
          creationDate: item.snippet.publishedAt
          title: item.snippet.title
          description: item.snippet.description
          thumbnailURL: item.snippet.thumbnails['default'].url

      youtubeAPI.videos.list {part: 'statistics', id: videoIDs.toString()}, (error, res) ->
        return deferred.reject(error) if error
        i = 0
        for item in res.items
          videos[i].counts = item.statistics
          counts.view += parseInt(item.statistics.viewCount)
          counts.like += parseInt(item.statistics.likeCount)
          counts.dislike += parseInt(item.statistics.dislikeCount)
          counts.favorite += parseInt(item.statistics.favoriteCount)
          counts.comment += parseInt(item.statistics.commentCount)
          i++
        deferred.resolve
          list: videos
          stats: [
            getStat('view')
            getStat('like')
            getStat('dislike')
            getStat('favorite')
            getStat('comment')
          ]
  deferred.promise

searchPage = (tokens, channelName) ->
  console.log 'searchPage'
  deferred = Q.defer()
  query =
    auth: API_KEY
    part:'snippet'
    q: channelName
    type: 'channel'
    safeSearch: 'none'

  youtubeAPI.search.list query, (error, response) ->
    return deferred.reject(error) if error
    #TODO confirmed channels have a matching google+ account?
    channels = {}
    for item in response.items
      channels[item.id.channelId] =
        id: item.id.channelId
        creationDate: item.snippet.publishedAt
        name: item.snippet.channelTitle
        displayName: item.snippet.title
        description: item.snippet.description
        thumbnailURL: item.snippet.thumbnails['default'].url

    youtubeAPI.channels.list {auth: API_KEY, part:'statistics', id: Object.keys(channels).toString()},
      (error, res) ->
        deferred.reject(error) if error
        if res
          for item in res.items
            channels[item.id].counts =
              view: parseInt item.statistics.viewCount
              subscriber: parseInt item.statistics.subscriberCount
              video: parseInt item.statistics.videoCount
              comment: parseInt item.statistics.commentCount
        deferred.resolve Object.keys(channels).map (id) -> channels[id]
  deferred.promise

searchVideo = (videoName, maxResults, order, pageToken, oAuthToken) ->
  console.log 'google searchVideo'
  deferred = Q.defer()
  videos = {}
  channelIDs = []
  query =
    part: 'snippet'
    q: videoName
    type: 'video'
    maxResults: maxResults
    safeSearch: 'none'
  if oAuthToken
    oauth2Client.setCredentials oAuthToken
  else
    query.auth = API_KEY
  query.order = order if order?
  query.pageToken = pageToken if pageToken?

  totalResults = null
  nextPageToken = null
  prevPageToken = null
  console.log 'execute query: ', query
  youtubeAPI.search.list query, (error, response) ->
    if error
      console.log 'error: ', error
      return deferred.reject error
    totalResults = response.pageInfo.totalResults
    nextPageToken = response.nextPageToken
    prevPageToken = response.prevPageToken
    videos = []
    for item in response.items
      videos[item.id.videoId] =
        id: item.id.videoId
        channelId: item.snippet.channelId
        channelURL: 'https://www.youtube.com/channel/' + item.snippet.channelId
        creationDate: item.snippet.publishedAt
        title: item.snippet.title
        description: item.snippet.description
        thumbnailURL: item.snippet.thumbnails['default'].url
      if channelIDs.indexOf(item.snippet.channelId) is -1
        channelIDs.push item.snippet.channelId

    videoListParams =
      part: 'statistics,contentDetails'
      id: Object.keys(videos).toString()
    videoListParams.auth = API_KEY unless oAuthToken
    youtubeAPI.videos.list videoListParams, (error, res) ->
      if error
        console.error error
        deferred.reject error
      else
        if res
          for item in res.items
            #youtube duration format -> https://en.wikipedia.org/wiki/ISO_8601#Durations
            videos[item.id].duration = moment.duration(item.contentDetails.duration).asSeconds()
            videos[item.id].counts =
              view: parseInt item.statistics.viewCount
              like: parseInt item.statistics.likeCount
              dislike: parseInt item.statistics.dislikeCount
              favorite: parseInt item.statistics.favoriteCount
              comment: parseInt item.statistics.commentCount
        channelListParams =
          part: 'snippet'
          id: channelIDs.toString()
        channelListParams.auth = API_KEY unless oAuthToken
        youtubeAPI.channels.list channelListParams, (error, channelsResult) ->
          if error?
            console.error error
            deferred.reject error
          else
            channels = {}
            for channel in channelsResult.items
              channels[channel.id] = channel.snippet.title
            videoArray = Object.keys(videos).map (id) ->
              videos[id].channel = channels[videos[id].channelId]
              delete videos[id].channelId
              videos[id]
          deferred.resolve
            videos: videoArray
            totalResults:  totalResults
            nextPageToken: nextPageToken
            prevPageToken: prevPageToken
  deferred.promise

sendVideo = (tokens, file, user, videoParams, providerOptions) ->
  console.log 'sendVideo'
  deferred = Q.defer()
  oauth2Client.setCredentials tokens
  metaData =
    snippet:
      title: videoParams.title
      description: videoParams.description
      tags: videoParams.tags
      categoryId: providerOptions.category.id
    status:
      privacyStatus: providerOptions.privacyStatus
  buf = fs.readFileSync file.path
  if buf is undefined
    deferred.reject new Error 'cannot load file from path: ' + file.path
  params =
    part: Object.keys(metaData).join ','
    media:
      mimeType: file.mimetype
      body: buf
    resource: metaData
  # https://developers.google.com/youtube/v3/docs/videos/insert
  videoUploadRequest = youtubeAPI.videos.insert params
  videoUploadRequest.on 'complete', (response) ->
    try
      body = JSON.parse response.body
      if body.error?
        deferred.reject body.error
      else
        deferred.resolve
          url: 'https://www.youtube.com/watch?v=' + body.id
          thumbnail: body.snippet.thumbnails.high.url
    catch error
      deferred.reject error
  videoUploadRequest.on 'error', (error) ->
    deferred.reject new Error error
  #TODO do 'on data'?
  deferred.promise

uploadDrive = (tokens, file, parent) ->
  console.log 'uploadDrive'
  deferred = Q.defer()
  oauth2Client.setCredentials tokens
  metaData =
    uploadType: 'media'
    visibility: 'PRIVATE'
    title: file.originalname
  if parent isnt undefined
    metaData.parents = [id: parent]
  buf = fs.readFileSync(file.path)
  if buf is undefined
    deferred.reject new Error 'cannot load file from path: ' + file.path
  params =
    part: Object.keys(metaData).join ','
    media:
      mimeType: file.mimetype
      body: buf
      title: file.originalname
    resource: metaData
  videoUploadRequest = drive.files.insert params
  videoUploadRequest.on 'complete', (response) ->
    result
    try
      result = JSON.parse response.body
      deferred.resolve
        url: 'https://drive.google.com/file/d/' + result.id + '/view'
        downloadUrl: result.downloadUrl
    catch
      deferred.reject error
  videoUploadRequest.on 'error', (error) ->
    console.log 'video upload request failed: ', error
    deferred.reject new Error error
  deferred.promise

listFiles = (tokens, folderId, typeFilter) ->
  deferred = Q.defer()
  filter = 'trashed=false'
  if folderId is undefined
    folderId = 'root'
  filter += ' and "' + folderId + '" in parents'
  #image or video
  if typeFilter?
    if typeFilter is 'folder'
      filter += ' and mimeType="application/vnd.google-apps.folder" '
    else
      filter += ' and (mimeType="application/vnd.google-apps.folder" or mimeType contains "' + typeFilter + '/") '
  oauth2Client.setCredentials tokens
  drive.files.list {folderId: folderId, q: filter}, (error, response) ->
    if error
      console.log 'The API returned an error: ' + error
      deferred.reject new Error error
      return
    files = response.items
    if files.length is 0
      deferred.resolve()
    else
      deferred.resolve files.map (file) ->
        fileInfo =
          name: file.title
          id: file.id
          mimeType: file.mimeType
          isFolder: file.mimeType is FOLDER_MIME_TYPE
        if file.downloadUrl?
          fileInfo.downloadUrl = file.downloadUrl.replace '&gd=true', ''
        fileInfo
  deferred.promise

getUserInfo = (tokens) ->
  console.log 'getUserInfo'
  oauth2Client.setCredentials tokens
  deferred = Q.defer()
  googlePlus.people.get userId: 'me', (error, response) ->
    if error
      console.log 'getUserInfo error: ', error
      deferred.reject new Error error
    else
      deferred.resolve userName: response.displayName
  deferred.promise

downloadFile = (tokens, fileId) ->
  oauth2Client.setCredentials tokens
  #bytes are to be handled with a pipe()
  drive.files.get fileId: fileId + '?alt=media', (error) ->
    if error
      console.log "cannot get data for fileId: #{fileId} error: ", error

checkFileData = (tokens, fileId) ->
  deferred = Q.defer()
  drive.files.get fileId: fileId, (error, file) ->
    if error
      console.log "cannot get data for fileId: #{fileId} error: ", error
      deferred.reject error
    else
      fileInfo =
        name: file.title
        id: fileId
        mimeType: file.mimeType
        isFolder: file.mimeType is FOLDER_MIME_TYPE
      if file.downloadUrl
        fileInfo.downloadUrl = file.downloadUrl.replace '&gd=true', ''
      deferred.resolve fileInfo
  deferred.promise

getSpaceUsage = (tokens) ->
  oauth2Client.setCredentials tokens
  deferred = Q.defer()
  drive.about.get (error, infos) ->
    if error
      console.log 'cannot get googleDrive SpaceUsage, error: ', error
      deferred.reject error
    else
      deferred.resolve
        used: parseInt infos.quotaBytesUsedAggregate
        total: parseInt infos.quotaBytesTotal
  deferred.promise

createShareLink = (tokens, fileId) ->
  oauth2Client.setCredentials tokens
  deferred = Q.defer()
  permission =
    type: 'anyone'
    id: 'anyone'
    name:'anyone'
    role: 'reader'
    withLink: true

  drive.permissions.insert {fileId: fileId, resource: permission}, (error, results) ->
    if error
      console.log 'cannot change file permission ', error
      deferred.reject error
    else
      deferred.resolve results
  deferred.promise

deleteFile = (tokens, fileId) ->
  oauth2Client.setCredentials tokens
  deferred = Q.defer()
  drive.files.delete fileId: fileId, (error, res) ->
    if error
      console.log 'cannot delete file ', error
      deferred.reject error
    else
      deferred.resolve res
  deferred.promise

getUserCalendars = (tokens) ->
  oauth2Client.setCredentials tokens
  deferred = Q.defer()
  calendar.calendarList.list {}, (error, calendars) ->
    if error
      console.error 'error: ', error
      deferred.reject error
    else
    deferred.resolve calendars.items.map (item) ->
      accessRole: item.accessRole
      id: item.id
      backgroundColor: item.backgroundColor
      foregroundColor: item.foregroundColor
      name: item.summary
      selected: item.selected
      description: item.description
  deferred.promise

getUserEvents = (tokens, sinceDate, untilDate, calendarId) ->
  deferred = Q.defer()
  timeMin = moment(parseInt sinceDate).toISOString()
  timeMax = moment(parseInt untilDate).toISOString()
  oauth2Client.setCredentials tokens
  calendar.events.list
    calendarId: encodeURIComponent calendarId
    showHiddenInvitations: true
    timeMin: timeMin
    timeMax: timeMax
    singleEvents: true
    orderBy: 'startTime'
  , (error, events) ->
    if error
      console.error 'calendarId: ' + calendarId  + ', error: ', error
      deferred.reject error
    else
      results = []
      items = events.items
      for item in items
        results.push
          id: item.id
          name: item.summary
          start_time: item.start.dateTime
          end_time: item.end.dateTime
          description: item.description
          rsvp_status: item.status
          start: item.start.date
          creator: item.creator
          htmlLink: item.htmlLink
          location: item.location
      deferred.resolve results

  deferred.promise

# see https://developers.google.com/youtube/v3/guides/implementation/subscriptions
# only 50 first...
getSubscriptions = (tokens) ->
  console.log 'getSubscriptions'
  new Promise (resolve, reject) ->
    oauth2Client.setCredentials tokens
    params =
      part: 'snippet'
      mine: true
      order: 'alphabetical'
      maxResults: 50
    youtubeAPI.subscriptions.list params, {}, (error, result) ->
      if error
        console.log 'error in getSubscriptions: ', error
        return reject error
      console.log 'pageInfo: ', result.pageInfo
      resolve _.map result.items, (item) ->
        title: item.snippet.title
        channelId: item.snippet.channelId
        thumbnail: item.snippet.thumbnails.default.url
    return

module.exports =
  getOAuthURL: getOAuthURL
  pushCode: pushCode
  refreshTokens: refreshTokens
  listCategories: listCategories
  listMedia: listMedia
  searchPage: searchPage
  searchVideo: searchVideo
  sendVideo: sendVideo
  uploadDrive: uploadDrive
  listFiles: listFiles
  getUserInfo: getUserInfo
  downloadFile: downloadFile
  checkFileData: checkFileData
  getSpaceUsage: getSpaceUsage
  createShareLink: createShareLink
  deleteFile: deleteFile
  getUserCalendars: getUserCalendars
  getUserEvents: getUserEvents
  getSubscriptions: getSubscriptions
