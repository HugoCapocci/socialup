'use strict';
var google = require('googleapis');
var Q = require('q');
const CLIENT_ID = '460439937906-82cfg0afrcijo1imh4la3hcb78h692ga.apps.googleusercontent.com';
const CLIENT_SECRET = 'muE440-P1lSdV6OcNtnfeYIZ';
const REDIRECT_URL = 'http://localhost:3000/google2callback';
//const REDIRECT_URL = 'https://oauth.io/auth';

var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

function getShortUrl() {
    
    var urlshortener = google.urlshortener('v1');
    var params = { shortUrl: 'http://goo.gl/xKbRu3' };
    var deferred = Q.defer();
    // get the long url of a shortened url
    urlshortener.url.get(params, function (err, response) {
        if (err) {
            console.log('Encountered error', err);
            deferred.reject(new Error(err));
        } else {
            console.log('Long url is', response.longUrl);
            deferred.resolve(response.longUrl);
        }
    });
    return deferred.promise;
}

//generate url for OAuth authentication URI
function auth() {
    // generate a url that asks permissions for Google+ and Google Calendar scopes
    var scopes = [
      'https://www.googleapis.com/auth/youtube.upload'
    ];
    var url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
      scope: scopes // If you only need one scope you can pass it as string
    });
    return url;
};

function pushCode(code) {
    oauth2Client.getToken(code, function(err, tokens) {
        // Now tokens contains an access_token and an optional refresh_token. Save them.
        if(!err) {
            console.log("credentials set !");
            oauth2Client.setCredentials(tokens);
        } else {
            console.log("unable to set credentials, err: ", err);
        }
    });
};

exports.getShortUrl=getShortUrl;
exports.auth=auth;
exports.pushCode=pushCode;