###
# SOUNDCLOUD WEB API
# see https://developers.soundcloud.com/docs/api/guide
###

https = require('https')
http = require('http')
request = require('request')
Q = require('q')
fs = require('fs')
querystring = require('querystring')
CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID
CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET
REDIRECT_URI = process.env.APP_URL + '/soundcloud2callback'

exports.getOAuthURL = ->
  'https://soundcloud.com/connect?client_id='+CLIENT_ID+'&redirect_uri='+REDIRECT_URI+'&response_type=code'

exports.pushCode = (code, userId) ->
    
  console.log("pushing code: ",code)
  deferred = Q.defer()
  post_data = querystring.stringify
    'client_id': CLIENT_ID
    'client_secret': CLIENT_SECRET
    'redirect_uri' : REDIRECT_URI
    'grant_type' : 'authorization_code'
    'code' : code

  req_options =
    host: 'api.soundcloud.com'
    port: 443
    path: '/oauth2/token'
    method: 'POST'
    headers:
      'Content-Type': 'application/x-www-form-urlencoded'
      'Content-Length': post_data.length
  
  req = https.request req_options, (res) ->

    console.log('sound cloud code validation statusCode: ', res.statusCode)
    data=""
    res.on 'data', (chunk) ->
      data+=chunk
    
    res.on 'end', ->
      console.log("soundcloud code validated ? ", data)
      if not data
        deferred.reject new Error("No data returned by soundloud")
      else
        deferred.resolve JSON.parse(data)

  req.on 'error', (e) ->
    console.log('soundcloud authentication error: ', e)
    deferred.reject(e)

  # post the data
  req.write(post_data)
  req.end()
  deferred.promise

exports.getUserInfo = (tokens) ->

#https://api.soundcloud.com/me?oauth_token=A_VALID_TOKEN
  deferred = Q.defer()
  req_options =
    host: 'api.soundcloud.com'
    path: '/me/?oauth_token='+tokens.access_token
    method: 'GET'
  
  req = https.request req_options, (res) ->
    data=""
    res.on 'data', (chunk) ->
      data+=chunk
    
    res.on 'end', ->
      results = JSON.parse(data)
      if results.error
        console.log('soundcloud authentication error: ', results.error.message)
        deferred.reject(results.error)
      else
        deferred.resolve({userName:results.username, id : results.id})
  
  req.on 'error', (e) ->
    console.log('soundcloud authentication error: ', e)
    deferred.reject(e)

  req.end()
  deferred.promise

exports.sendMusic = (tokens, file, params) ->

  console.log('Soundcloud sendMusic')
  deferred = Q.defer()

  request
    method: 'POST'
    json: true
    uri: 'https://api.soundcloud.com/tracks'
    formData:
      oauth_token : tokens.access_token
      asset_data : fs.createReadStream(file.path)
      title : params.title
      sharing : 'private'
  
  , (err, response, body) ->

    if err
      deferred.reject(err)
    else
      console.log('Soundcloud Upload Response body: ', body)
      console.log("response.statusCode: ",response.statusCode)
      if response.statusCode >= 400
        deferred.reject(body)
      else
        deferred.resolve JSON.parse(body)
   
  deferred.promise

exports.listMedia = (tokens) ->

  deferred = Q.defer()
  req_options =
    host: 'api.soundcloud.com'
    path: '/me/tracks?oauth_token='+tokens.access_token
    method: 'GET'

  req = https.request req_options, (res) ->
    data=""
    res.on 'data', (chunk) ->
      data+=chunk

    res.on 'end', ->
    
      results = JSON.parse(data)
      if results.error
        console.log('soundcloud list musics error: ', results.error.message)
        deferred.reject(results.error)
      else

        counts=
          playback:0
          download:0
          like:0
          comment:0
        
        getStat = (name) ->
          return { name : name, value : counts[name]}
        
        listSounds = results.map (music) ->
        
          counts.playback += music.playback_count
          counts.download += music.download_count
          counts.like += music.favoritings_count
          counts.comment += music.comment_count
          result
            id : music.id
            title : music.title
            creationDate : new Date(music.created_at)
            permalinkURL : music.permalink_url
            thumbnailURL : music.artwork_url
            description : music.description
            counts :
              playback : music.playback_count
              download : music.download_count
              like : music.favoritings_count
              comment : music.comment_count
        
        deferred.resolve
          list : listSounds
          stats : [
              getStat('playback'),
              getStat('download'),
              getStat('like'),
              getStat('comment')
          ]

  req.on 'error', (e) ->
    console.log('soundcloud authentication error: ', e)
    deferred.reject(e)
 
  req.end()
  deferred.promise