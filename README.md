[![Build Status](https://semaphoreci.com/api/v1/projects/83543cfd-965b-404c-97e5-f33d9d79c284/557613/badge.svg)](https://semaphoreci.com/drhelmut/socialup)

Live: https://socialup.herokuapp.com

========

Allow multiple operation from one entry proint, schedule publications, and so on...

use config vars (process.env.<VAR>) on a localeConfig.js file (aleardy git-ignored)

DAILYMOTION_API_KEY, DAILYMOTION_API_SECRET : OAuth credentials for dailymotion
FACEBOOK_APP_ID, FACEBOOK_APP_SECRET : OAuth credentials for facebook
GOOGLE_API_ID, GOOGLE_API_SECRET : OAuth credentials for google/youtube
DROPBOX_APP_KEY, DROPBOX_APP_SECRET : OAuth credentials for dropbox cloud storage
TWITTER_APP_KEY, TWITTER_APP_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET : OAuth credentials for twitter

MONGOLAB_URI : Url to cloud mongolab database
APP_URL : your target URL
PORT : your target port