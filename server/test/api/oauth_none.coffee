should = require('should')
fs = require('fs')
oAuthNonce = require('../../coffee/api/oauth_nonce')

describe 'api/oauth_nonce', ->

  describe 'oAuthNonce generator', ->
    
    it "test sync mode", ->

      token = oAuthNonce()
      should.exist(token)

    it "test async mode", (done) ->
        
      token = oAuthNonce (token) ->   
        console.log('oauth nonce token: ',token)
        should.exist(token)
        done()
