[![Build Status](https://semaphoreci.com/api/v1/projects/83543cfd-965b-404c-97e5-f33d9d79c284/557613/badge.svg)](https://semaphoreci.com/drhelmut/socialup)

Live: https://socialup.herokuapp.com

========

Allow multiple social networks operation from one entry point: schedule publications, explore cloud storage and publish from them to naywhere, and so on

Use config vars (process.env.<VAR>) on a localeConfig.js file *(aleardy git-ignored)*

- DAILYMOTION_API_KEY, DAILYMOTION_API_SECRET: OAuth credentials for dailymotion
- FACEBOOK_APP_ID, FACEBOOK_APP_SECRET: OAuth credentials for facebook
- GOOGLE_API_ID, GOOGLE_API_SECRET, GOOGLE_API_KEY: OAuth credentials for google/youtube
- DROPBOX_APP_KEY, DROPBOX_APP_SECRET: OAuth credentials for dropbox cloud storage
- TWITTER_APP_KEY, TWITTER_APP_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET: OAuth credentials for twitter
- LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET: OAuth credentials for LinkedIn
- VIMEO_CLIENT_ID, VIMEO_CLIENT_SECRET: OAuth credentials for Vimeo
- MIXCLOUD_CLIENT_ID, MIXCLOUD_CLIENT_SECRET: OAuth credentials for Mixcloud
- SOUNDCLOUD_CLIENT_ID, SOUNDCLOUD_CLIENT_SECRET: OAuth credentials for Soundcloud

- MONGOLAB_URI : Url to cloud mongolab database
- GMAIL_USER, GMAIL_PASSWORD: credentials for smtp, using googleAPI
- APP_URL : your target URL
- PORT : your target port