
/*
 * MIXCLOUD WEB API
 * see https://www.mixcloud.com/developers/
 */
var CLIENT_ID, CLIENT_SECRET, Q, REDIRECT_URI, fs, http, https, request;

https = require('https');

http = require('http');

request = require('request');

Q = require('q');

fs = require('fs');

CLIENT_ID = process.env.MIXCLOUD_CLIENT_ID;

CLIENT_SECRET = process.env.MIXCLOUD_CLIENT_SECRET;

REDIRECT_URI = process.env.APP_URL + '/mixcloud2callback';

exports.getOAuthURL = function() {
  return 'https://www.mixcloud.com/oauth/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + REDIRECT_URI;
};

exports.pushCode = function(code, userId) {
  var deferred, req, req_options;
  deferred = Q.defer();
  req_options = {
    host: 'www.mixcloud.com',
    port: 443,
    path: '/oauth/access_token?client_id=' + CLIENT_ID + '&redirect_uri=' + REDIRECT_URI + '?state=' + userId + '&client_secret=' + CLIENT_SECRET + '&code=' + code,
    method: 'GET'
  };
  req = https.request(req_options, function(res) {
    var data;
    data = "";
    res.on('data', function(chunk) {
      return data += chunk;
    });
    return res.on('end', function() {
      return deferred.resolve(JSON.parse(data));
    });
  });
  req.on('error', function(e) {
    console.log('mixcloud authentication error: ', e);
    return deferred.reject(e);
  });
  req.end();
  return deferred.promise;
};

exports.getUserInfo = function(tokens) {
  var deferred, req, req_options;
  deferred = Q.defer();
  req_options = {
    host: 'api.mixcloud.com',
    path: '/me/?access_token=' + tokens.access_token,
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
        console.log('mixcloud authentication error: ', results.error.message);
        return deferred.reject(results.error);
      } else {
        return deferred.resolve({
          userName: results.username
        });
      }
    });
  });
  req.on('error', function(e) {
    console.log('mixcloud authentication error: ', e);
    return deferred.reject(e);
  });
  req.end();
  return deferred.promise;
};

exports.sendMusic = function(tokens, file, params) {
  var deferred, formData, i, j, ref;
  formData = {
    mp3: fs.createReadStream(file.path),
    name: params.title,
    description: params.description
  };
  if (params.tags && params.tags.length > 0) {
    for (i = j = 0, ref = params.tags.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
      formData['tags-' + i + '-tag'] = params.tags[i];
    }

    /* track sections
    sections-0-chapter=Introduction" \
    -F "sections-0-start_time=0" \
    -F "sections-1-artist=Artist Name" \
    -F "sections-1-song=Song Title" \
    -F "sections-1-start_time=10" \
     */
    deferred = Q.defer();
    request({
      method: 'POST',
      uri: 'https://api.mixcloud.com/upload/?access_token=' + tokens.access_token,
      formData: formData
    }, function(err, response, body) {
      var result;
      if (err) {
        return deferred.reject(err);
      } else {
        result = JSON.parse(body);
        if (result.error) {
          return deferred.reject(result);
        } else {
          return deferred.resolve(result);
        }
      }
    });
    return deferred.promise;
  }
};

exports.listMedia = function(tokens) {
  var deferred, req, req_options;
  deferred = Q.defer();
  req_options = {
    host: 'api.mixcloud.com',
    path: '/me/cloudcasts/?access_token=' + tokens.access_token,
    method: 'GET'
  };
  req = https.request(req_options, function(res) {
    var data;
    data = "";
    res.on('data', function(chunk) {
      return data += chunk;
    });
    return res.on('end', function() {
      var counts, dataList, getStat, results;
      results = JSON.parse(data);
      if (results.error) {
        console.log('mixcloud listMedia error: ', results.error.message);
        return deferred.reject(results.error);
      } else {
        counts = {
          listener: 0,
          playback: 0,
          repost: 0,
          like: 0,
          comment: 0
        };
        getStat = function(name) {
          return {
            name: name,
            value: counts[name]
          };
        };
        dataList = results.data.map(function(music) {
          counts.listener += music.listener_count;
          counts.playback += music.play_count;
          counts.repost += music.repost_count;
          counts.like += music.favorite_count;
          counts.comment += music.comment_count;
          return {
            id: music.key,
            title: music.name,
            creationDate: music.created_time,
            streamURL: music.url,
            thumbnailURL: music.pictures.medium,
            description: music.description,
            counts: {
              listener: music.listener_count,
              playback: music.play_count,
              repost: music.repost_count,
              like: music.favorite_count,
              comment: music.comment_count
            }
          };
        });
        return deferred.resolve({
          list: dataList,
          stats: [getStat('listener'), getStat('playback'), getStat('repost'), getStat('like'), getStat('comment')]
        });
      }
    });
  });
  req.on('error', function(e) {
    console.log('mixcloud listMedia error: ', e);
    return deferred.reject(e);
  });
  req.end();
  return deferred.promise;
};
