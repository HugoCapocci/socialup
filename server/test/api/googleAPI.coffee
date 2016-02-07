fs = require('fs')
googleAPI = require('../../js/api/googleAPI.coffee')
should = require('should')

if process.env.GOOGLE_API_KEY is undefined
  try require('../../localeConfig.js')
  catch
   console.log("No configuration file found")

describe 'test Google API', ->

  it 'check auth url', ->

    authURL = googleAPI.getOAuthURL()
    authURL.should.containEql('https://accounts.google.com/o/oauth2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth')

  it 'wrong token should be rejected', (done) ->
    googleAPI.pushCode('4/bzJ4zkPNwJXShSLmB1IRhHRFyXcqFiNUEANXOZVtSEU').then null, (err) ->
      done()
