fs = require 'fs'
moment = require 'moment'
should = require 'should'

require '../../localeConfig' unless process.env.MONGOLAB_URI?

scheduler = require '../../src/server/coffee/scheduler.coffee'

describe 'scheduler', ->
  USER = 'test_user'
  USER2 = 'test_user_bis'

  after (done) ->
    @timeout(10000)
    #empty collection after tests
    MongoClient = require('mongodb').MongoClient
    MongoClient.connect process.env.MONGOLAB_URI, (err, db) ->
      db.collection("scheduledEvents").remove {}, ->
        db.close()
        done()

  it 'should play schedule event with 1 parameter only', (done) ->
    #old date so job will be executed directly
    date = new Date(Date.now() + 1500)
    scheduler.addEventListerner 'event1', (eventId, userId, param) ->
      console.log 'event avec param: ', param
      should(param).be.exactly 'test'
      done()
    eventId = scheduler.scheduleEvent USER, date, 'event1', 'test'
    console.log 'eventId: , eventId'

  it 'schedule event with 3 parameters', (done) ->
    @timeout 3000
    #old date so job will be executed directly
    date = new Date(Date.now() + 1500)
    event = (eventId, userId, params) ->
      should(params[0]).be.exactly('test1')
      should(params[1]).be.exactly('test2')
      should(params[2]).be.exactly('test3')
      done()
    scheduler.addEventListerner "event2", event
    eventId = scheduler.scheduleEvent USER, date, "event2", ["test1", "test2", "test3"]
    console.log "eventId: ",eventId

  it 'schedule late event', (done) ->
    @timeout 4000
    #newer date
    date = new Date(Date.now() + 1500)
    eventId
    event = (eventId, userId, params) ->
      should(params[0]).be.exactly "late test"
      #event cannot be cancelled anymore, since it has been executed
      scheduler.cancelEvent(eventId).should.equal false
      done()
    scheduler.addEventListerner 'event3', event
    eventId = scheduler.scheduleEvent USER, date, "event3", ["late test"]

  it 'schedule late event then cancel it', ->
    #newer date
    date = new Date(Date.now() + 3000000)
    eventId = scheduler.scheduleEvent USER, date, null, [""]
    scheduler.cancelEvent(eventId).should.equal(true)

  it 'cancel non existing event should return false', ->
    scheduler.cancelEvent(USER2+Date.now()).should.equal false

  it 'schedule complex function', (done) ->
    @timeout 3000
    facebookAPI = require '../../src/server/coffee/api/facebookAPI.coffee'
    event = ->
      oauthURL = facebookAPI.getOAuthURL()
      (oauthURL.length).should.be.above 1
      done()
    scheduler.addEventListerner "event4", event
    date = new Date(Date.now() + 1500)
    eventId = scheduler.scheduleEvent USER, date, "event4", [""]

  it 'save scheduled event in database (then execute it)', (done) ->
    @timeout 5000
    date = new Date Date.now() + 3000
    eventId=null
    event = (eventId, userId, params) ->
      finish params
    finish = (params) ->
      console.log "late event, eventId: ", eventId
      should(params[0]).be.exactly "late test"
      done()
    scheduler.addEventListerner "event5", event
    scheduler.saveScheduledEvent USER, date, "event5", ["late test"]
    .then (result) ->
      eventId = result
    .catch (err) ->
      console.log 'err in save Scheduled Event: ', err
      done err

  it 'save complex scheduled event in database (then execute it)', (done) ->
    facebookAPI = require '../../src/server/coffee/api/facebookAPI.coffee'
    event = facebookAPI.getOAuthURL
    @timeout 10000
    date = new Date(Date.now() + 3000)
    scheduler.addEventListerner 'event6', event
    scheduler.saveScheduledEvent USER, date, 'event6', [""]
    .then (result) ->
      console.log "result? ", result
      done()
    .catch (err) ->
      console.log "err dans save Scheduled Event: ", err
      done err
