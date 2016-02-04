
/*
 * SOUNDCLOUD WEB API
 * see https://developers.soundcloud.com/docs/api/guide
 */
var CLIENT_ID, CLIENT_SECRET, Q, REDIRECT_URI, fs, http, https, querystring, request;

https = require('https');

http = require('http');

request = require('request');

Q = require('q');

fs = require('fs');

querystring = require('querystring');

CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;

CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET;

REDIRECT_URI = process.env.APP_URL + '/soundcloud2callback';

exports.getOAuthURL = function() {
  return 'https://soundcloud.com/connect?client_id=' + CLIENT_ID + '&redirect_uri=' + REDIRECT_URI + '&response_type=code';
};

exports.pushCode = function(code, userId) {
  var deferred, post_data, req, req_options;
  console.log("pushing code: ", code);
  deferred = Q.defer();
  post_data = querystring.stringify({
    'client_id': CLIENT_ID,
    'client_secret': CLIENT_SECRET,
    'redirect_uri': REDIRECT_URI,
    'grant_type': 'authorization_code',
    'code': code
  });
  req_options = {
    host: 'api.soundcloud.com',
    port: 443,
    path: '/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length
    }
  };
  req = https.request(req_options, function(res) {
    var data;
    console.log('sound cloud code validation statusCode: ', res.statusCode);
    data = "";
    res.on('data', function(chunk) {
      return data += chunk;
    });
    return res.on('end', function() {
      console.log("soundcloud code validated ? ", data);
      if (!data) {
        return deferred.reject(new Error("No data returned by soundloud"));
      } else {
        return deferred.resolve(JSON.parse(data));
      }
    });
  });
  req.on('error', function(e) {
    console.log('soundcloud authentication error: ', e);
    return deferred.reject(e);
  });
  req.write(post_data);
  req.end();
  return deferred.promise;
};

exports.getUserInfo = function(tokens) {
  var deferred, req, req_options;
  deferred = Q.defer();
  req_options = {
    host: 'api.soundcloud.com',
    path: '/me/?oauth_token=' + tokens.access_token,
    method: 'GET'
  };
  req = https.request(req_options, function(res) {
    var data;
    data = "";
    res.on('data', function(chunk) {
      return data += chunk;
    });
    return res.on('end', function() {
      var results;
      results = JSON.parse(data);
      if (results.error) {
        console.log('soundcloud authentication error: ', results.error.message);
        return deferred.reject(results.error);
      } else {
        return deferred.resolve({
          userName: results.username,
          id: results.id
        });
      }
    });
  });
  req.on('error', function(e) {
    console.log('soundcloud authentication error: ', e);
    return deferred.reject(e);
  });
  req.end();
  return deferred.promise;
};

exports.sendMusic = function(tokens, file, params) {
  var deferred;
  console.log('Soundcloud sendMusic');
  deferred = Q.defer();
  request({
    method: 'POST',
    json: true,
    uri: 'https://api.soundcloud.com/tracks',
    formData: {
      oauth_token: tokens.access_token,
      asset_data: fs.createReadStream(file.path),
      title: params.title,
      sharing: 'private'
    }
  }, function(err, response, body) {
    if (err) {
      return deferred.reject(err);
    } else {
      console.log('Soundcloud Upload Response body: ', body);
      console.log("response.statusCode: ", response.statusCode);
      if (response.statusCode >= 400) {
        return deferred.reject(body);
      } else {
        return deferred.resolve(JSON.parse(body));
      }
    }
  });
  return deferred.promise;
};

exports.listMedia = function(tokens) {
  var deferred, req, req_options;
  deferred = Q.defer();
  req_options = {
    host: 'api.soundcloud.com',
    path: '/me/tracks?oauth_token=' + tokens.access_token,
    method: 'GET'
  };
  req = https.request(req_options, function(res) {
    var data;
    data = "";
    res.on('data', function(chunk) {
      return data += chunk;
    });
    return res.on('end', function() {
      var counts, getStat, listSounds, results;
      results = JSON.parse(data);
      if (results.error) {
        console.log('soundcloud list musics error: ', results.error.message);
        return deferred.reject(results.error);
      } else {
        counts = {
          playback: 0,
          download: 0,
          like: 0,
          comment: 0
        };
        getStat = function(name) {
          return {
            name: name,
            value: counts[name]
          };
        };
        listSounds = results.map(function(music) {
          counts.playback += music.playback_count;
          counts.download += music.download_count;
          counts.like += music.favoritings_count;
          counts.comment += music.comment_count;
          return result({
            id: music.id,
            title: music.title,
            creationDate: new Date(music.created_at),
            permalinkURL: music.permalink_url,
            thumbnailURL: music.artwork_url,
            description: music.description,
            counts: {
              playback: music.playback_count,
              download: music.download_count,
              like: music.favoritings_count,
              comment: music.comment_count
            }
          });
        });
        return deferred.resolve({
          list: listSounds,
          stats: [getStat('playback'), getStat('download'), getStat('like'), getStat('comment')]
        });
      }
    });
  });
  req.on('error', function(e) {
    console.log('soundcloud authentication error: ', e);
    return deferred.reject(e);
  });
  req.end();
  return deferred.promise;
};
