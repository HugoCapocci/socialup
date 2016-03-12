###
# MIXCLOUD WEB API
# see https://www.mixcloud.com/developers/
###

https = require('https')
http = require('http')
request = require('request')
Q = require('q')
fs = require('fs')
CLIENT_ID = process.env.MIXCLOUD_CLIENT_ID
CLIENT_SECRET = process.env.MIXCLOUD_CLIENT_SECRET
REDIRECT_URI = process.env.APP_URL + '/mixcloud2callback'

exports.getOAuthURL = () ->
  'https://www.mixcloud.com/oauth/authorize?client_id='+CLIENT_ID+'&redirect_uri='+REDIRECT_URI

exports.pushCode = (code, userId) ->

  deferred = Q.defer()
  req_options =
    host: 'www.mixcloud.com'
    port: 443
    path: '/oauth/access_token?client_id='+CLIENT_ID+'&redirect_uri='+REDIRECT_URI+'?state='+userId+'&client_secret='+
    CLIENT_SECRET+'&code='+code
    method: 'GET'

  req = https.request req_options, (res) ->
    data=""
    res.on 'data', (chunk) ->
      data+=chunk

    res.on 'end', ->
      deferred.resolve JSON.parse(data)

  req.on 'error', (e) ->
    console.log('mixcloud authentication error: ', e)
    deferred.reject(e)
  req.end()
  deferred.promise

exports.getUserInfo = (tokens) ->

  deferred = Q.defer()
  req_options =
    host: 'api.mixcloud.com'
    path: '/me/?access_token='+tokens.access_token
    method: 'GET'

  req = https.request req_options, (res) ->
    data=""
    res.on 'data', (chunk) ->
      data+=chunk

    res.on 'end', ->
      results = JSON.parse(data)
      if results.error
        console.log('mixcloud authentication error: ', results.error.message)
        deferred.reject(results.error)
      else
        deferred.resolve({userName:results.username})

  req.on 'error', (e) ->
    console.log('mixcloud authentication error: ', e)
    deferred.reject(e)

  req.end()
  deferred.promise

exports.sendMusic = (tokens, file, params) ->

  #post https://api.mixcloud.com/upload/
  formData=
    mp3: fs.createReadStream(file.path)
    name : params.title
    description : params.description

  #5 tags max
  if params.tags and params.tags.length>0
    for i in [0..params.tags.length-1]
      formData['tags-'+i+'-tag']=params.tags[i]

    ### track sections
    sections-0-chapter=Introduction" \
    -F "sections-0-start_time=0" \
    -F "sections-1-artist=Artist Name" \
    -F "sections-1-song=Song Title" \
    -F "sections-1-start_time=10" \###

    deferred = Q.defer()
    request
      method: 'POST'
      uri: 'https://api.mixcloud.com/upload/?access_token='+tokens.access_token
      formData: formData
    ,(err, response, body) ->
      if err
        deferred.reject(err)
      else
        result = JSON.parse(body)
        if result.error
          deferred.reject(result)
        else
          deferred.resolve(result)

    deferred.promise

exports.listMedia = (tokens) ->

  deferred = Q.defer()
  req_options =
    host: 'api.mixcloud.com'
    path: '/me/cloudcasts/?access_token='+tokens.access_token
    method: 'GET'

  req = https.request req_options, (res) ->
    data=""
    res.on 'data', (chunk) ->
      data+=chunk

    res.on 'end', ->
      results = JSON.parse(data)
      if results.error
        console.log('mixcloud listMedia error: ', results.error.message)
        deferred.reject(results.error)
      else
        counts=
          listener:0
          playback:0
          repost:0
          like:0
          comment:0
        getStat = (name) ->
          return { name : name, value : counts[name]}

        dataList = results.data.map (music) ->

          counts.listener += music.listener_count
          counts.playback += music.play_count
          counts.repost += music.repost_count
          counts.like += music.favorite_count
          counts.comment += music.comment_count

          return {
            id : music.key,
            title : music.name,
            creationDate : music.created_time,
            streamURL : music.url,
            thumbnailURL : music.pictures.medium,
            description : music.description,
            counts : {
              listener : music.listener_count,
              playback : music.play_count,
              repost : music.repost_count,
              like : music.favorite_count,
              comment : music.comment_count
            }
          }

        deferred.resolve
          list: dataList
          stats: [
            getStat('listener'),
            getStat('playback'),
            getStat('repost'),
            getStat('like'),
            getStat('comment')
          ]

  req.on 'error', (e) ->
    console.log('mixcloud listMedia error: ', e)
    deferred.reject(e)

  req.end()
  deferred.promise