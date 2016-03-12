bluebird = require 'bluebird'
fs = require 'fs'
request = require 'request'
chai = require 'chai'
chaiAsPromised = require 'chai-as-promised'
sinonchai = require 'sinon-chai'
should = chai.should
sinon = require 'sinon'
twitterAPI = require '../../../src/server/coffee/api/twitterAPI'

chai.use sinonchai

TEST_BASE_STRING = 'POST&https%3A%2F%2Fapi.twitter.com%2F1%2Fstatuses%2Fupdate.json&include_entities%3Dtrue%26oauth_consumer_key%3Dxvz1evFS4wEEPTGEFPHBog%26oauth_nonce%3DkYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1318622958%26oauth_token%3D370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb%26oauth_version%3D1.0%26status%3DHello%2520Ladies%2520%252B%2520Gentlemen%252C%2520a%2520signed%2520OAuth%2520request%2521'
TEST_SIGNING_KEY = 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw&LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE'
TEST_SIGNATURE = 'tnnArxj06cWHq44gCs1OSKk/jLY='

describe 'test Twitter API', ->

  params =
    status: 'Hello Ladies + Gentlemen, a signed OAuth request!'
    include_entities: true
    oauth_consumer_key: 'xvz1evFS4wEEPTGEFPHBog'
    oauth_nonce: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg'
    oauth_signature_method: 'HMAC-SHA1'
    oauth_timestamp: 1318622958
    oauth_token: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb'
    oauth_version: '1.0'
  httpMethod='post'
  url = 'https://api.twitter.com/1/statuses/update.json'
  consumerSecret='kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw'
  tokenSecret = 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE'

  describe 'Signature', ->

    it 'STEP 1 - signature base string encoding', ->
      twitterAPI.createSignatureBaseString(params, httpMethod, url).should.equal(TEST_BASE_STRING)

    it 'STEP 2 - signing key', ->
      twitterAPI.createSigningKey(consumerSecret, tokenSecret).should.equal(TEST_SIGNING_KEY)

    it 'STEP 3 - create signature', ->
      twitterAPI.createSignature(TEST_BASE_STRING, TEST_SIGNING_KEY).should.equal(TEST_SIGNATURE)

    it 'Global Signature TEST ', ->
      twitterAPI.getSignature(params, httpMethod, url, tokenSecret, consumerSecret).should.equal(TEST_SIGNATURE)

    it 'body response to token object', ->
      tokens = twitterAPI.bodyToTokens("param1=value1&param2=value2")
      tokens.param1.should.equal('value1')
      tokens.param2.should.equal('value2')

    it 'check oauth url', ->
      twitterAPI.getOAuthURL().should.equal('https://api.twitter.com/oauth/authorize')

  describe 'DAO API', ->
    beforeEach ->
      @sandbox = sinon.sandbox.create()

    afterEach ->
      @sandbox.restore()

    describe 'tweets', ->
      it 'should get tweets', (done) ->
        sinon.stub(twitterAPI, 'getSignature').returns 'dummySignature'
        sinon.stub(request, 'get').yields(null, null, {})
        twitterAPI.getTweets(oauth_token: 'dummy_oauth_token').then (tweets) ->
          #console.log 'tweets: ', tweets
          console.log twitterAPI.getSignature()
          done()
        .catch (error) ->
          console.log 'error: ', console.error
          done error
        #.and.notify done
