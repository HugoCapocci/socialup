require('dotenv').config()
express = require 'express'
multer  = require 'multer'
upload = multer dest: 'server/uploads/'
fs = require 'fs'
Q = require 'q'

providersAPI = require './providersAPI'
UserDAO = require './userDAO'
userDAO = new UserDAO()
EventsDAO = require './eventsDAO'
eventsDAO = new EventsDAO()
EmailService = require './emailService'
emailService = new EmailService()
app = express()
TWITTER = 'twitter'

users = {}
initiateUser = (user) ->
  console.log 'initiate user with id: ', user
  users[user] =
    id: user
    providers: {}
  return

scheduler = require './scheduler'

scheduler.addEventListerner 'message', (eventId, userId, providers, providersOptions, message) ->
  postMessageToProviders(userId, providers, providersOptions, message)
  .then (results) ->
    eventsDAO.updateScheduledEventAfterExecution(eventId, results)
  .catch (err) ->
    eventsDAO.updateScheduledEventAfterError(eventId, err)

scheduler.addEventListerner 'uploadVideo',
(eventId, userId, providers, providersOptions, file, title, description, tags) ->
  params =
    title: title
    description: description
    tags: tags
    file: file

  publishFileToProviders userId, providers, providersOptions, file, params
  .then (results) ->
    if results and results.length > 0 and results[0].url
      params.url = results[0].url
    console.log 'publishFileToProviders results: ', results
    eventsDAO.updateScheduledEventAfterExecution eventId, results
    eventsDAO.retrieveChainedEvents eventId
  .catch (err) ->
    eventsDAO.updateScheduledEventAfterError(eventId, err)
  .then (chainedEvents) ->
    executeChainedEvents(chainedEvents, params)
  .fin ->
    #eventsDAO.updateScheduledEventAfterExecution(eventId, results);
    fs.unlink(file.path)

getRefreshedToken = (provider, userId) ->
  myToken = users[userId].providers[provider].tokens
  if provider isnt 'soundcloud' and myToken.expiry_date and myToken.expiry_date <= Date.now()
    console.log "refresh oauth token for provider #{provider}"
    if providersAPI[provider].refreshTokens instanceof Function
      if provider is 'google'
        myToken = users[userId].providers[provider].originalTokens
      providersAPI[provider].refreshTokens(myToken, userId)
      .then (tokens) ->
        users[userId].providers[provider].tokens = tokens
        userDAO.updateUserTokens(userId, provider, tokens)
        Q.fcall -> tokens
    else
      Q.fcall -> throw new Error 'no "refreshTokens" function for provider ' + provider
  else
    Q.fcall -> myToken

executeChainedEvents = (chainedEvents, args) ->
  results = []
  for chainedEvent in chainedEvents
    console.log 'execute chainedEvent: ', chainedEvent
    console.log 'with results: ', results
    params = null
    if chainedEvent.eventType is 'message'
      params =
        url: args.url
        title: args.title
        description: args.description
    else if chainedEvent.eventType is 'uploadCloud'
      params =
        file: args.file
    results.push executeChainedEvent(chainedEvent, params)
  Q.all results

executeChainedEvent = (event, params) ->
  console.log 'executeChainedEvent: ',event
  if event.eventType is 'message'
    postMediaLinkToProviders event.user, event.providers, event.eventParams[0], params.url, params.title,
    params.description, event.providersOptions
  else if event.eventType is 'uploadCloud'
    console.log 'upload drive with params: ', params
    provider = event.providers[0]

    getRefreshedToken(provider, event.user).then (tokens) ->
      providersAPI[provider].uploadDrive tokens, params.file, event.eventParams[0]
    .then (results) ->
      console.log 'eventsDAO.updateChainedEventAfterExecution'
      eventsDAO.updateChainedEventAfterExecution event._id, results
    .catch(err) ->
      eventsDAO.updateChainedEventAfterError event._id, err

userDAO.retrieveUsers().then (usersFound) ->
  console.log 'retieved users: ', usersFound
  for user in usersFound
    users[user._id] = user
  scheduler.loadScheduledEvents()

app.set 'port', process.env.PORT
app.use express.static 'public'
app.set 'views', __dirname + '/public'
bodyParser = require 'body-parser'
app.use bodyParser.urlencoded extended: false
app.use bodyParser.json()
cookieParser = require 'cookie-parser'
app.use cookieParser()

#returns URL for oauth authentication
app.get '/oauthURL/:provider/:userId', (req, res) ->

  provider = req.params.provider
  userId = req.params.userId

  #twitter is more complicated and cannot give synch url
  if provider is 'twitter'
    providersAPI.twitter.getTokens userId
    .then (tokens) ->
      #store token for user
      if not users[userId]
        initiateUser userId
      users[userId].providers[provider] =
        userName: ''
        tokens: tokens
      res.send providersAPI.twitter.getOAuthURL() + '?oauth_token=' + tokens.oauth_token
    .catch (err) ->
      res.send err
  else
    if not providersAPI[provider]
      res.send '404'
    else
      res.send providersAPI[provider].getOAuthURL()

app.get '/*2callback', (req, res) ->
  provider = req.path.split('2callback')[0].substr(1)
  code = req.query.code
  userId = req.query.state
  getTokens = null

  initiateUser userId unless users[userId]?
  if provider is TWITTER
    if not users[userId].providers[TWITTER]
      res.status(400).end 'Error in twitter oauth process'
    oauth_token = req.query.oauth_token
    oauth_verifier = req.query.oauth_verifier
    tokens = users[userId].providers[TWITTER].tokens
    tokens.oauth_token = oauth_token
    getTokens = ->
      providersAPI.twitter.getAccessToken oauth_verifier, tokens
    return
  else
    getTokens = ->
      providersAPI[provider].pushCode code, userId
    return

  getTokens()
  .then (tokens) ->
    if tokens.expires_in
      tokens.expiry_date = Date.now() + (if provider is 'linkedin' then tokens.expires_in * 1000 else tokens.expires_in)
      delete tokens.expires_in
    users[userId].providers[provider] = tokens: tokens
    #save google original token with refresh-token apart
    if provider is 'google' and tokens.refresh_token
      users[userId].providers[provider].originalTokens = tokens
    providersAPI[provider].getUserInfo(tokens)

  .then (userInfo) ->
    users[userId].providers[provider].userName = userInfo.userName
    userDAO.saveUser users[userId]
  .then (userSaved) ->
    users[userId] = userSaved
    res.redirect '/#?close=true'
  .catch (err) ->
    console.error 'error: ', err
    res.send err

app.get '/searchTweets/', (req, res) ->
  query = req.query.q
  providersAPI.twitter.searchTweets query
  .then (tweets) ->
    res.send tweets
  .catch (err) ->
    res.send err

app.get '/events/:userId', (req, res) ->
  userId = req.params.userId
  eventsDAO.retrieveScheduledEventsByUser userId
  .then (events) ->
    res.send events
  .catch (err) ->
    res.send err

app.get '/chainedEvents/:eventParentId', (req, res) ->
  eventParentId = req.params.eventParentId
  eventsDAO.retrieveChainedEvents eventParentId
  .then (events) ->
    res.send(events)
  .catch (err) ->
    res.send err

app.get '/tracedEvents/:userId', (req, res) ->
  userId = req.params.userId
  eventsDAO.retrieveTracedEventsByUser(userId).then (events) ->
    res.send(events)
  .catch (err) ->
    res.send err

app.get '/event/:eventId', (req, res) ->
  eventId = req.params.eventId
  eventsDAO.retrieveScheduledEvent(eventId).then (events) ->
    res.send events
  .catch (err) ->
    res.send err

app.post '/event/:eventId', (req, res) ->
  eventId = req.params.eventId
  scheduledEvent = req.body
  eventsDAO.updateScheduledEvent(eventId, scheduledEvent).then(result) ->
    res.send(result)
  .catch (err) ->
    res.send err

app.post '/event/chained/:provider/:eventId/:userId', (req, res) ->
  eventId = req.params.eventId
  userId = req.params.userId
  provider = req.params.provider
  scheduledEvent = req.body
  eventsDAO.createChainedEvent eventId, userId, scheduledEvent.eventType, [provider], undefined,
  scheduledEvent.eventParams
  .then (result) ->
    res.send result
  .catch (err) ->
    res.send err

app.delete '/event/:eventId', (req, res) ->
  eventId = req.params.eventId
  eventsDAO.deleteScheduledEvent(eventId).then (result) ->
    res.status( if result is 1 then 200 else 400).end()
  .catch (err) -> res.send err

app.delete '/event/chained/:eventId/:eventParentId', (req, res) ->
  eventId = req.params.eventId
  eventParentId = req.params.eventParentId
  eventsDAO.deleteChainedEvent(eventId, eventParentId).then (result) ->
    res.status(if result is 1 then 200 else 400).end()
  .catch (err) -> res.send err

app.delete '/event/traced/:eventId', (req, res) ->
  eventId = req.params.eventId
  eventsDAO.deleteTracedEvent(eventId).then (result) ->
    res.status(if result is 1 then 200 else 400).end()
  .catch (err) -> res.send err

app.delete '/token/:provider/:userId', (req, res) ->
  provider = req.params.provider
  userId = req.params.userId
  userDAO.deleteToken provider, userId
  .then (result) ->
    delete users[userId].providers[provider]
    res.status(if result is 1 then 200 else 400).end()
  .catch (err) ->
    res.send(err)

app.get '/refreshToken/:provider/:userId', (req, res) ->
  provider = req.params.provider
  userId = req.params.userId
  getRefreshedToken provider, userId
  .then (tokens) ->
    users[userId].tokens[provider] = tokens
    userDAO.updateUserTokens userId, provider, tokens
    res.status(200).end()
  .catch (err) -> res.send err

app.get '/user/:userId', (req, res) ->
  userId = req.params.userId
  userDAO.retrieveUserById(userId).then (user) ->
    res.send user
  .catch (err) -> res.send err

app.get '/cloudExplorer/:provider/:folderId/:userId', (req, res) ->
  folderId = req.params.folderId
  provider = req.params.provider
  userId = req.params.userId
  typeFilter = req.query.typeFilter

  getRefreshedToken(provider, userId).then (tokens) ->
    providersAPI[provider].listFiles(tokens, folderId, typeFilter)
  .then (files) ->
    res.send(files)
  .catch (err) ->
    res.send(err)

app.get '/file/:provider/:fileId/:userId', (req, res) ->
  fileId = req.params.fileId
  provider = req.params.provider
  userId = req.params.userId
  getRefreshedToken(provider, userId).then (tokens) ->
    #pipe the bytes returned from request to the response 'res', in order to directly download the file
    providersAPI[provider].downloadFile(tokens, fileId).pipe(res)
  .catch (err) ->
    res.send(err)

app.delete '/file/:provider/:fileId/:userId', (req, res) ->
  fileId = req.params.fileId
  provider = req.params.provider
  userId = req.params.userId
  getRefreshedToken(provider, userId).then (tokens) ->
    #pipe the bytes returned from request to the response 'res', in order to directly download the file
    providersAPI[provider].deleteFile(tokens, fileId)
  .then ->
    res.status(204).end()
  .catch (err) -> res.send err

app.get '/spaceUsage/:provider/:userId', (req, res) ->
  provider = req.params.provider
  userId = req.params.userId
  getRefreshedToken(provider, userId).then (tokens) ->
    providersAPI[provider].getSpaceUsage(tokens)
  .then (spaceUsage) ->
    res.send(spaceUsage)
  .catch (err) -> res.send err

app.get '/searchPage/:provider/:pageName', (req, res) ->
  provider = req.params.provider
  pageName = req.params.pageName
  userId = req.query.userId
  if not userId
    providersAPI[provider].searchPage(undefined, pageName).then (pagesFound) ->
      res.send(pagesFound)
    .catch (err) -> res.send err
  else
    getRefreshedToken(provider, userId).then (tokens) ->
      providersAPI[provider].searchPage(tokens, pageName)
    .then (pagesFound) ->
      res.send(pagesFound)
    .catch (err) -> res.send err

app.get '/pageMetrics/:provider/:metricType/:pageId', (req, res) ->
  provider = req.params.provider
  metricType = req.params.metricType
  pageId = req.params.pageId
  sinceData = req.query.since
  untilDate = req.query.until
  userId = req.query.userId
  if not userId
    providersAPI[provider].getPageMetrics undefined, metricType, pageId, sinceData, untilDate
    .then (pagesFound) ->
      res.send(pagesFound)
    .catch (err) ->
      res.send(err)
  else
    getRefreshedToken(provider, userId).then (tokens) ->
      providersAPI[provider].getPageMetrics tokens, metricType, pageId, sinceData, untilDate
    .then (pagesFound) ->
      res.send(pagesFound)
    .catch (err) -> res.send err

app.post '/message/:userId', (req, res) ->
  userId = req.params.userId
  providers = req.body.providers
  message = req.body.message
  scheduledDate = req.body.scheduledDate
  eventParentId = req.body.eventParentId
  providersOptions = req.body.providersOptions

  if eventParentId
    eventsDAO.createChainedEvent eventParentId, userId, 'message', providers, providersOptions, [message]
    .then (eventId) ->
      res.send(eventId)
    .catch (err) ->
      res.send('Cannot create or save chained event: ' + err)

  else if scheduledDate? or (new Date scheduledDate).getTime() <= Date.now()
    #direct message
    postMessageToProviders userId, providers, providersOptions, message
    .then (results) ->
      eventsDAO.createTracedEvent(userId, 'message', [message], providers, providers, results)
      res.send(results)
    .catch (err) ->
      eventsDAO.createTracedEventError(userId, 'message', [message], providers, providers, err)
      res.send('Cannot send message err: ' + err)

  else
    #scheduled event (eventId, userId, date, eventType, providers, eventParams)
    console.log('schedule event for ',scheduledDate)
    scheduler.saveScheduledEvent userId, scheduledDate, 'message', providers, providersOptions, [message]
    .then (eventId) ->
      res.send(eventId)
    .catch (err) ->
      res.send('Cannot create or save scheduled event: ' + err)

#simple message
postMessageToProviders = (userId, providers, providersOptions, message) ->
  results = []
  for provider in providers
    results.push postMessageToProvider userId, provider,
    (if providersOptions then providersOptions[provider] else undefined), message
  Q.all results

postMessageToProvider = (userId, provider, providerOptions, message) ->
  deffered = Q.defer()
  if not providersAPI[provider] or not providersAPI[provider].postMessage
    deffered.reject(new Error 'unknow provider ' + provider + ' or unsupported function postMessage' )

  getRefreshedToken provider, userId
  .then (tokens) ->
    providersAPI[provider].postMessage tokens, message, providerOptions
  .then (result) ->
    result.provider = provider
    deffered.resolve result
  .catch (err) ->
    deffered.reject err
  deffered.promise

#message with media link
postMediaLinkToProviders = (userId, providers, message, url, name, description, messageProvidersOptions) ->
  results = []
  console.log 'postMediaLinkToProviders, messageProvidersOptions: ',messageProvidersOptions
  for provider in providers
    if messageProvidersOptions?
      results.push postMediaLinkToProvider userId, provider, message, url, name, description,
      messageProvidersOptions[provider]
    else
      results.push postMediaLinkToProvider(userId, provider, message, url, name, description)
  Q.all results

postMediaLinkToProvider = (userId, provider, message, url, name, description, messageProviderOptions) ->
  console.log 'postMediaLinkToProvider, messageProviderOptions: ',messageProviderOptions
  deffered = Q.defer()
  if not providersAPI[provider] or not providersAPI[provider].postMediaLink
    deffered.reject new Error 'unknow provider ' + provider + ' or unsupported function postMessage'

  getRefreshedToken provider, userId
  .then (tokens) ->
    providersAPI[provider].postMediaLink tokens, message, url, name, description, messageProviderOptions
  .then (result) ->
    deffered.resolve result
  .catch (err) ->
    deffered.reject err
  deffered.promise

app.post '/publishFromCloud/:userId', (req, res) ->
  userId = req.params.userId
  providers = req.body.providers
  providersOptions = req.body.providersOptions
  cloudProvider = req.body.cloudProvider
  #id or path of the file to download from cloud
  fileId = req.body.fileId
  fileName = req.body.fileName
  writeStream = null

  getRefreshedToken(cloudProvider, userId)
  .then (tokens) ->
    writeStream = fs.createWriteStream './server/uploads/' + userId + fileName
    providersAPI[cloudProvider].downloadFile(tokens, fileId).pipe writeStream
    writeStream.on 'finish', ->
      console.log 'file downloaded '
      params =
        title: req.body.title
        description: req.body.description
      if req.body.tags
        params.tags = req.body.tags
        console.log 'publishFileToProviders params: ', params
      console.log 'providers: ',providers
      publishFileToProviders userId, providers, providersOptions, path: './server/uploads/' + userId + fileName, params
      .then (results) ->
        #delete temp file
        fs.unlink './server/uploads/' + userId + fileName
        eventsDAO.createTracedEvent userId, 'publishFromCloud', [params.title, params.description, params.tags,
        cloudProvider], providers, providersOptions, results
        res.send results
      .catch (err) ->
        console.log err
        eventsDAO.createTracedEventError userId, 'publishFromCloud', [params.title, params.description, params.tags,
        cloudProvider], providers, providersOptions, err
        res.status(403).send err

    writeStream.on 'error', (err) ->
      console.log err
      res.status(403).send err

app.post '/uploadFileToCloud/:userId', upload.single 'file', (req, res) ->
  provider = req.body.provider
  userId = req.params.userId
  getRefreshedToken provider, userId
  .then (tokens) ->
    providersAPI[provider].uploadDrive tokens, req.file, req.body.target
  .then (result) ->
    eventsDAO.createTracedEvent userId, 'uploadFileToCloud', [req.file.originalname], [provider], undefined, result
    res.send result
  .catch (err) ->
    res.status(403).send err

app.post '/uploadMusic/:userId', upload.single('file'), (req, res) ->
  path = req.file.path
  fs.renameSync path, path + '_' + req.file.originalname
  req.file.path = path + '_' + req.file.originalname
  userId = req.params.userId
  #TODO add scheduler
  #var scheduledDate = req.body.scheduledDate
  providers = req.body.providers.split ','
  params =
    title: req.body.title
    description: req.body.description
  if req.body.tags?
    params.tags = req.body.tags.split ','
  sendMusicToProviders providers, userId, req.file, params
  .then (results) ->
    fs.unlink req.file.path
    eventsDAO.createTracedEvent userId, 'uploadMusic', params, providers, undefined, results
    res.send results
  .catch (err) ->
    console.log err
    eventsDAO.createTracedEventError userId, 'uploadMusic', params, providers, undefined, err
    res.status(403).send err

sendMusicToProviders = (providers, userId, file, params) ->
  results = []
  for provider in providers
    results.push sendMusicToProvider(provider, userId, file, params)
  Q.all results

sendMusicToProvider = (provider, userId, file, params) ->
  deffered = Q.defer()
  getRefreshedToken provider, userId
  .then (tokens) ->
    console.log 'sendMusic with provider: ', provider
    providersAPI[provider].sendMusic tokens, file, params
  .then (result) ->
    result.provider = provider
    deffered.resolve result
  .catch (err) ->
    deffered.reject err
  deffered.promise

app.post '/uploadFile/:userId', upload.single('file'), (req, res) ->
  #dailymotion issue : need file extension
  path = req.file.path
  fs.renameSync path, path + '_' + req.file.originalname
  req.file.path = path + '_' + req.file.originalname
  userId = req.params.userId
  scheduledDate = req.body.scheduledDate
  providers = req.body.providers.split ','
  providersOptions = JSON.parse req.body.selectedProvidersOptions

  console.log 'scheduledDate? ', scheduledDate
  console.log 'selectedProvidersOptions? ', providersOptions
  params =
    title : req.body.title
    description : req.body.description

  if req.body.tags
    params.tags = req.body.tags.split ','

  if not scheduledDate or (new Date scheduledDate).getTime() <= Date.now()
    publishFileToProviders userId, providers, providersOptions, req.file, params
    .then (results) ->
      console.log('uploadFile OK')
      fs.unlink(req.file.path)
      #async save
      eventsDAO.createTracedEvent(userId, 'uploadVideo', params, providers, providersOptions, results)
      res.send(results)
    .catch (err) ->
      console.error('error in uploadFile: ', err)
      eventsDAO.createTracedEventError(userId, 'uploadVideo', params, providers, providersOptions, err)
      res.status(403).send(err)
  #scheduled event
  else
    scheduler.saveScheduledEvent userId, scheduledDate, 'uploadVideo', providers, providersOptions, [req.file,
    params.title, params.description, params.tags]
    .then (eventId) ->
      res.send(eventId)
    .catch (err) ->
      console.log('err dans save Scheduled Event: ', err)
      res.send('Cannot create or save scheduled event: ' + err)

publishFileToProviders = (userId, providers, providersOptions, file, params) ->
  results = []
  for provider in providers
    results.push publishFileToProvider(userId, provider, providersOptions[provider],file, params)
  Q.all(results)

publishFileToProvider = (userId, provider, providerOptions, file, params) ->
  deffered = Q.defer()
  getRefreshedToken(provider, userId).then (tokens) ->
    providersAPI[provider].sendVideo(tokens, file, userId, params, providerOptions)
  .then (result) ->
    result.provider = provider
    deffered.resolve(result)
  .catch (err) ->
    deffered.reject(err)
  deffered.promise

app.get '/calendars/:provider/:userId', (req, res) ->
  userId = req.params.userId
  provider = req.params.provider
  getRefreshedToken provider, userId
  .then (tokens) ->
    providersAPI[provider].getUserCalendars tokens
  .then (calendars) ->
    res.send calendars
  .catch (err) ->
    res.status(404).send err

app.get '/socialEvents/:provider/:userId', (req, res) ->
  userId = req.params.userId
  provider = req.params.provider
  sinceDate = req.query.since
  untilDate = req.query.until
  calendarId = req.query.calendarId

  getRefreshedToken(provider, userId).then (tokens) ->
    providersAPI[provider].getUserEvents tokens, sinceDate, untilDate, calendarId
  .then (events) ->
    res.send events
  .catch (err) ->
    res.status(404).send err

app.get '/facebookGroups/:userId', (req, res) ->
  userId = req.params.userId
  getRefreshedToken('facebook', userId).then (tokens) ->
    providersAPI.facebook.getUserGroups tokens
  .then (groups) ->
    res.send(groups)
  .catch (err) ->
    res.status(404).send(err)

app.get '/facebookPages/:userId', (req, res) ->
  userId = req.params.userId
  providersAPI.facebook.getPages users[userId].providers.facebook.tokens
  .then (pages) ->
    res.send pages
  .catch (err) ->
    res.status(404).send err

#cache
providersCategories = {}
app.get '/categories/:provider/:userId', (req, res) ->
  provider = req.params.provider
  userId = req.params.userId
  #put categories in cache (avoid calls for almost static data)
  if providersCategories[provider]?
    res.send providersCategories[provider]
  else
    getRefreshedToken provider, userId
    .then (tokens) ->
      providersAPI[provider].listCategories tokens, userId
    .then (categories) ->
      providersCategories[provider] = categories
      res.send categories
    .catch (err) ->
      res.status(403).send err

app.get '/search/video/:provider', (req, res) ->
  provider = req.params.provider
  videoName = req.query.videoName
  order = req.query.order
  next = req.query.next
  limit = req.query.limit
  if not limit or parseInt(limit) < 10 or parseInt(limit) > 50
    res.status(422).send 'limit field not properly set (must be >= 10 and <=50)'
  else
    providersAPI[provider].searchVideo videoName, limit, order, next
    .then (videos) ->
      res.send videos
    .catch (err) ->
      res.status(403).send err

app.get '/media/:provider/:userId', (req, res) ->
  provider = req.params.provider
  userId = req.params.userId
  getRefreshedToken provider, userId
  .then (tokens) ->
    providersAPI[provider].listMedia tokens, userId, users[userId].providers[provider].userName
  .then (media) ->
    res.send media
  .catch (err) ->
    res.status(403).send err

app.get '/authenticate', (req, res) ->
  login = req.query.login
  password = req.query.password
  if login? and password?
    userDAO.authenticate login, password
    .then (data) ->
      res.send data
    .catch (err) ->
      console.log 'authenticate error: ', err
      res.status(403).end()
  else
    console.log 'social auth not yet implemented'
    res.status(404).end()

app.post '/user/create', (req, res) ->
  firstName = req.body.firstName
  lastName = req.body.lastName
  login = req.body.login
  password = req.body.password
  if login? and password? and firstName? and lastName?
    user =
      firstName: firstName
      lastName: lastName
      login: login
      password: password
      providers: {}
      confirmed: false
    userDAO.saveUser user
    .then (data) ->
      console.log 'user created: ', data
      emailService.sendConfirmationMail login, data._id
      res.send data
    .catch (err) ->
      console.log err
      res.status(404).end()
  else
    console.log 'social user registration not yet implemented'
    res.status(404).end()

app.post '/user/updatePassword/:userId', (req, res) ->
  id = req.params.userId
  newPassword = req.body.newPassword
  userDAO.retrieveUserById id
  .then (user) ->
    user.password = newPassword
    userDAO.updateUser user
  .then (data) ->
    console.log user modified
    res.send data
  .catch (err) ->
    console.log err
    res.status(404).end()

app.post '/user/resetPassword/:userEmail', (req, res) ->
  userEmail = req.params.userEmail

  userDAO.retrieveUserByLogin userEmail
  .then (userFound) ->
    emailService.sendResetPasswordMail 'reset', userEmail, userFound._id
  .then (data) ->
    res.send data
  .catch (err) ->
    console.log err
    res.status(404).end()

server = app.listen app.get('port'), ->
  console.log 'Express server started on port %s', server.address().port
