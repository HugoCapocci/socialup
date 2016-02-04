###
# Google WEB API
# Youtube see https://developers.google.com/youtube/v3/
# GoogeDrive see https://developers.google.com/drive/web/about-sdk
# Google+ see https://developers.google.com/+/domains/getting-started
#
# TODO check tokens.expiry_date and update user data in database
# if needed with refreshed tokens (automatically refresh by googleAPI)
###

googleAPI = require('googleapis')
Q = require('q')
fs = require("fs")
userDAO = require('../userDAO.coffee')
moment = require('moment')
GOOGLE_API_ID = process.env.GOOGLE_API_ID
GOOGLE_API_SECRET = process.env.GOOGLE_API_SECRET
GOOGLE_REDIRECT_URL = process.env.APP_URL + '/google2callback'
API_KEY = process.env.GOOGLE_API_KEY
FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
OAuth2 = googleAPI.auth.OAuth2
oauth2Client = new OAuth2(GOOGLE_API_ID, GOOGLE_API_SECRET, GOOGLE_REDIRECT_URL)
youtubeAPI = googleAPI.youtube({version: 'v3', auth: oauth2Client})
drive = googleAPI.drive({version: 'v2', auth: oauth2Client})
googlePlus = googleAPI.plus({version : 'v1', auth: oauth2Client})
calendar = googleAPI.calendar({version : 'v3', auth: oauth2Client})

#generate url for OAuth authentication URI
exports.getOAuthURL = ->

  #generate a url that asks permissions for Google+ and Google Calendar scopes
  scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtubepartner',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/plus.me',
    'https://www.googleapis.com/auth/plus.stream.write',
    'https://www.googleapis.com/auth/calendar'
  ]
  url = oauth2Client.generateAuthUrl
    access_type: 'offline'
    scope: scopes

exports.pushCode = (code) ->

  deferred = Q.defer()
  #ask for token
  oauth2Client.getToken code, (err, tokens) ->
    # Now tokens contains an access_token and an optional refresh_token. Save them.
    if not err
      oauth2Client.setCredentials(tokens)
      deferred.resolve(tokens)
    else
      console.log("unable to set credentials, err: ", err)
      deferred.reject(err)

  deferred.promise

exports.refreshTokens = (tokens, userId) ->

  deferred = Q.defer()
  credentials =
    access_token: tokens.access_token

  if tokens.refresh_token
    credentials.refresh_token=tokens.refresh_token
  oauth2Client.setCredentials(credentials)

  oauth2Client.refreshAccessToken (err, tokens) ->
    if not err
      oauth2Client.setCredentials(tokens)
      deferred.resolve(tokens)
    else
    console.log("unable to set credentials, err: ", err)
    deferred.reject(err)

  deferred.promise

exports.listCategories = (tokens) ->

  oauth2Client.setCredentials(tokens)
  deferred = Q.defer()
  youtubeAPI.videoCategories.list {part:'snippet', regionCode:'fr', hl:'fr_FR'}, (err, response) ->
    if err
      deferred.reject(err)
    else
      categories = []
      for item in response.items
        if item.snippet.assignable
          categories.push
            id : item.id
            name : item.snippet.title
      deferred.resolve(categories)

  deferred.promise

#see https://developers.google.com/youtube/v3/docs/search/list#forMine
exports.listMedia = (tokens, userId) ->

  oauth2Client.setCredentials(tokens)
  deferred = Q.defer()
  videoIDs = []
  youtubeAPI.search.list {part:'snippet', forMine : true, type : 'video'}, (err, response) ->

    if err
      deferred.reject(err)
    else
      videos = []
      counts=
        view:0
        like:0
        dislike:0
        favorite:0
        comment:0
      getStat = (name) ->
        return { name : name, value : counts[name]}

      for item in response.items
        videoIDs.push(item.id.videoId)
        videos.push
          id : item.id.videoId
          creationDate : item.snippet.publishedAt
          title : item.snippet.title
          description : item.snippet.description
          thumbnailURL : item.snippet.thumbnails['default'].url

      youtubeAPI.videos.list {part:'statistics', id : videoIDs.toString()}, (e, res) ->

        i=0
        for item in res.items
          videos[i].counts = item.statistics
          counts.view += parseInt(item.statistics.viewCount)
          counts.like += parseInt(item.statistics.likeCount)
          counts.dislike += parseInt(item.statistics.dislikeCount)
          counts.favorite += parseInt(item.statistics.favoriteCount)
          counts.comment += parseInt(item.statistics.commentCount)
          i++

        deferred.resolve
          list : videos
          stats : [
            getStat('view'),
            getStat('like'),
            getStat('dislike'),
            getStat('favorite'),
            getStat('comment')
          ]
  deferred.promise

exports.searchPage = (tokens, channelName) ->

  deferred = Q.defer()
  query =
    auth : API_KEY
    part :'snippet'
    q : channelName
    type : 'channel'
    safeSearch : 'none'

  youtubeAPI.search.list query, (err, response) ->

    if err
      deferred.reject(err)
    else
      #TODO confirmed channels have a matching google+ account?
      channels = {}
      for item in reponse.items
        channels[item.id.channelId] =
          id : item.id.channelId
          creationDate : item.snippet.publishedAt
          name : item.snippet.channelTitle
          displayName : item.snippet.title
          description : item.snippet.description
          thumbnailURL : item.snippet.thumbnails['default'].url

      youtubeAPI.channels.list {auth: API_KEY, part:'statistics', id : Object.keys(channels).toString()}, (err, res) ->

        if res
          for item in res.items
            channels[item.id].counts =
              view : parseInt(item.statistics.viewCount)
              subscriber : parseInt(item.statistics.subscriberCount)
              video : parseInt(item.statistics.videoCount)
              comment : parseInt(item.statistics.commentCount)

        deferred.resolve Object.keys(channels).map (id) -> channels[id]

  deferred.promise

exports.searchVideo = (videoName, maxResults, order, pageToken) ->

  deferred = Q.defer()
  videos = {}
  channelIDs = []
  query =
    auth : API_KEY
    part :'snippet'
    q : videoName
    type : 'video'
    maxResults : maxResults
    safeSearch : 'none'

  if order
    query.order=order
  if pageToken
    query.pageToken=pageToken

  totalResults=null
  nextPageToken=null
  prevPageToken=null
  youtubeAPI.search.list query, (err, response) ->

    if err
      deferred.reject(err)
    else
      totalResults = response.pageInfo.totalResults
      nextPageToken = response.nextPageToken
      prevPageToken = response.prevPageToken
      videos = []
      for item in response.items

        videos[item.id.videoId] =
          id : item.id.videoId
          channelId : item.snippet.channelId
          channelURL : 'https://www.youtube.com/channel/'+item.snippet.channelId
          creationDate : item.snippet.publishedAt
          title : item.snippet.title
          description : item.snippet.description
          thumbnailURL : item.snippet.thumbnails['default'].url

        if channelIDs.indexOf(item.snippet.channelId) is -1
          channelIDs.push(item.snippet.channelId)

    #TODO use tokens if user is connected
    youtubeAPI.videos.list {auth: API_KEY, part:'statistics,contentDetails', id : Object.keys(videos).toString()}
    ,(err, res) ->

      if err
        console.error(err)
        deferred.reject(err)
      else
        if res
          for item in res.items
            #youtube duration format -> https://en.wikipedia.org/wiki/ISO_8601#Durations
            videos[item.id].duration = moment.duration(item.contentDetails.duration).asSeconds()
            videos[item.id].counts =
              view : parseInt(item.statistics.viewCount)
              like : parseInt(item.statistics.likeCount)
              dislike : parseInt(item.statistics.dislikeCount)
              favorite : parseInt(item.statistics.favoriteCount)
              comment : parseInt(item.statistics.commentCount)

        youtubeAPI.channels.list {auth: API_KEY, part:'snippet', id : channelIDs.toString()} , (err, channelsResult) ->

          if err
            console.error(err)
            deferred.reject(err)
          else
            channels = {}
            for channel in channelsResult.items
              channels[channel.id]=channel.snippet.title
            videoArray = Object.keys(videos).map (id) ->
              videos[id].channel = channels[videos[id].channelId]
              delete videos[id].channelId
              videos[id]

          deferred.resolve
            videos : videoArray
            totalResults :  totalResults
            nextPageToken : nextPageToken
            prevPageToken : prevPageToken

  deferred.promise

exports.sendVideo = (tokens, file, user, videoParams, providerOptions) ->

  deferred = Q.defer()
  oauth2Client.setCredentials(tokens)

  metaData =
    snippet:
      title: videoParams.title
      description: videoParams.description
      tags: videoParams.tags
      categoryId: providerOptions.category.id
    status:
      privacyStatus: providerOptions.privacyStatus

  buf = fs.readFileSync(file.path)
  if buf is undefined
    deferred.reject(new Error('cannot load file from path: '+file.path))
  params =
    part : Object.keys(metaData).join(',')
    media :
      mimeType : file.mimetype
      body : buf
    resource : metaData
  # https://developers.google.com/youtube/v3/docs/videos/insert
  videoUploadRequest = youtubeAPI.videos.insert params
  videoUploadRequest.on 'complete', (response) ->
    try
      body = JSON.parse(response.body)
      if body.error
        deferred.reject(body.error)
      else
        deferred.resolve
          url : 'https://www.youtube.com/watch?v='+body.id
          thumbnail : body.snippet.thumbnails.high.url
    catch
      deferred.reject(error)

  videoUploadRequest.on 'error', (err) ->
    deferred.reject new Error(err)

  #TODO do 'on data'?
  deferred.promise

exports.uploadDrive = (tokens, file, parent) ->

  deferred = Q.defer()
  oauth2Client.setCredentials(tokens)
  metaData =
    uploadType : 'media'
    visibility: 'PRIVATE'
    title : file.originalname

  if parent isnt undefined
    metaData.parents = [{id:parent}]

  buf = fs.readFileSync(file.path)
  if buf is undefined
    deferred.reject new Error('cannot load file from path: '+file.path)

  params =
    part : Object.keys(metaData).join(',')
    media :
      mimeType : file.mimetype
      body : buf
      title : file.originalname
    resource : metaData

  videoUploadRequest = drive.files.insert params
  videoUploadRequest.on 'complete', (response) ->
    result
    try
      result = JSON.parse(response.body)
      deferred.resolve
        url : 'https://drive.google.com/file/d/'+result.id+'/view'
        downloadUrl : result.downloadUrl
    catch
      deferred.reject(error)

  videoUploadRequest.on 'error', (err) ->
    console.log("video upload request failed: ", err)
    deferred.reject new Error(err)

  deferred.promise

exports.listFiles = (tokens, folderId, typeFilter) ->

  deferred = Q.defer()
  filter = 'trashed=false'

  if folderId is undefined
    folderId='root'

  filter+=' and "'+folderId+'" in parents'
  #image or video
  if typeFilter isnt undefined
    if typeFilter is 'folder'
      filter+=' and mimeType="application/vnd.google-apps.folder" '
    else
      filter+=' and (mimeType="application/vnd.google-apps.folder" or mimeType contains "'+typeFilter+'/") '

  oauth2Client.setCredentials(tokens)
  drive.files.list { folderId : folderId, q: filter}, (err, response) ->
    if err
      console.log('The API returned an error: ' + err)
      deferred.reject new Error(err)
      return

    files = response.items
    if files.length is 0
      deferred.resolve()
    else
      deferred.resolve files.map (file) ->
        fileInfo =
          name:file.title
          id: file.id
          mimeType : file.mimeType
          isFolder : file.mimeType is FOLDER_MIME_TYPE
        if file.downloadUrl
          fileInfo.downloadUrl = file.downloadUrl.replace('&gd=true','')
        return fileInfo

  deferred.promise

exports.getUserInfo = (tokens) ->

  oauth2Client.setCredentials(tokens)
  deferred = Q.defer()
  googlePlus.people.get {userId:'me'}, (err, response) ->

    if err
      console.log('getUserInfo error: ', err)
      deferred.reject new Error(err)
    else
      deferred.resolve({userName : response.displayName})

  deferred.promise

exports.downloadFile = (tokens,fileId) ->

  oauth2Client.setCredentials(tokens)
  #bytes are to be handled with a pipe()
  drive.files.get {fileId:fileId+'?alt=media'}, (err) ->
    if err
      console.log("cannot get data for fileId: "+fileId+" error: ", err)

exports.checkFileData = (tokens, fileId) ->

  deferred = Q.defer()
  drive.files.get {fileId:fileId}, (err, file) ->
    if err
      console.log("cannot get data for fileId: "+fileId+" error: ", err)
      deferred.reject(err)
    else
      fileInfo =
        name:file.title
        id: fileId
        mimeType : file.mimeType
        isFolder : file.mimeType is FOLDER_MIME_TYPE

      if file.downloadUrl
        fileInfo.downloadUrl = file.downloadUrl.replace('&gd=true','')
      deferred.resolve(fileInfo)

  deferred.promise

exports.getSpaceUsage = (tokens) ->

  oauth2Client.setCredentials(tokens)
  deferred = Q.defer()
  drive.about.get (err, infos) ->
    if err
      console.log("cannot get googleDrive SpaceUsage, error: ", err)
      deferred.reject(err)
    else
      deferred.resolve
        used : parseInt(infos.quotaBytesUsedAggregate)
        total : parseInt(infos.quotaBytesTotal)

  deferred.promise

exports.createShareLink = (tokens, fileId) ->

  oauth2Client.setCredentials(tokens)
  deferred = Q.defer()
  permission =
    type : 'anyone'
    id : 'anyone'
    name :'anyone'
    role : 'reader'
    withLink : true

  drive.permissions.insert {fileId:fileId, resource : permission}, (err, results) ->
    if err
      console.log("cannot change file permission ", err)
      deferred.reject(err)
    else
      deferred.resolve(results)
  deferred.promise

exports.deleteFile = (tokens, fileId) ->

  oauth2Client.setCredentials(tokens)
  deferred = Q.defer()
  drive.files.delete {fileId:fileId}, (err, res) ->
    if err
      console.log("cannot delete file ", err)
      deferred.reject(err)
    else
      deferred.resolve(res)

  deferred.promise

exports.getUserCalendars = (tokens) ->

  oauth2Client.setCredentials(tokens)
  deferred = Q.defer()
  calendar.calendarList.list {}, (err, calendars) ->
    if err
      console.error('err: ', err)
      deferred.reject(err)
    else
    deferred.resolve calendars.items.map (item) ->
      result
        accessRole: item.accessRole
        id: item.id
        backgroundColor: item.backgroundColor
        foregroundColor: item.foregroundColor
        name: item.summary
        selected: item.selected
        description: item.description

  deferred.promise

exports.getUserEvents = (tokens, sinceDate, untilDate, calendarId) ->

  deferred = Q.defer()
  timeMin = moment(parseInt(sinceDate)).toISOString()
  timeMax = moment(parseInt(untilDate)).toISOString()
  oauth2Client.setCredentials(tokens)

  calendar.events.list
    calendarId: encodeURIComponent(calendarId)
    showHiddenInvitations: true
    timeMin: timeMin
    timeMax: timeMax
    singleEvents: true
    orderBy: 'startTime'

  ,(err, events) ->

    if err
      console.error('calendarId: '+calendarId +', err: ', err)
      deferred.reject(err)
    else

      results = []
      items = events.items
      for item in items
        results.push
          id: item.id
          name: item.summary
          start_time: item.start.dateTime
          end_time: item.end.dateTime
          description : item.description
          rsvp_status : item.status
          start : item.start.date
          creator : item.creator
          htmlLink : item.htmlLink
          location : item.location

      deferred.resolve(results)

  deferred.promise