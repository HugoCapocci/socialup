chai = require 'chai'
chaiAsPromised = require 'chai-as-promised'
sinonchai = require 'sinon-chai'

chai.use chaiAsPromised
chai.use sinonchai

EventsDAO = require '../../src/server/coffee/eventsDAO'
Promise = require 'bluebird'
eventsDao = new EventsDAO()
fs = require 'fs'
moment = require 'moment'
scheduler = require '../../src/server/coffee/scheduler'
should = chai.should
sinon = require 'sinon'

describe.skip 'scheduler', ->
  USER = 'testUser'
  USER2 = 'testUserBis'

  beforeEach ->
    @sandbox = sinon.sandbox.create()
    @sandbox.stub(eventsDao, 'saveScheduledEvent').returns Promise.resolve 'savedEvent'

  afterEach ->
    @sandbox.restore()

  it 'should play schedule event with 1 parameter only', (done) ->
    date = new Date Date.now() + 1000
    scheduler.addEventListerner 'event1', (eventId, userId, param) ->
      console.log 'event avec param: ', param
      param.should.equal 'test'
      done()
    eventId = scheduler.scheduleEvent USER, date, 'event1', 'test'
    console.log 'eventId: ', eventId

  it 'schedule event with 3 parameters', (done) ->
    date = new Date Date.now() + 1000
    event = (eventId, userId, params) ->
      params[0].should.equal 'test1'
      params[1].should.equal 'test2'
      params[2].should.equal 'test3'
      done()
    scheduler.addEventListerner 'event2', event
    eventId = scheduler.scheduleEvent USER, date, 'event2', ['test1', 'test2', 'test3']
    console.log 'eventId: ', eventId

  it.skip 'schedule late event', (done) ->
    date = new Date Date.now() + 1000
    eventId
    event = (eventId, userId, params) ->
      params[0].should.equal 'lateTest'
      #event cannot be cancelled anymore, since it has been executed
      scheduler.cancelEvent(eventId).should.be.false
      done()
    scheduler.addEventListerner 'event3', event
    eventId = scheduler.scheduleEvent USER, date, 'event3', ['lateTest']
    console.log 'eventId: ', eventId

  it 'schedule late event then cancel it', ->
    date = new Date Date.now() + 3000000
    eventId = scheduler.scheduleEvent USER, date, null, ['']
    scheduler.cancelEvent(eventId).should.be.true

  it 'cancel non existing event should return false', ->
    scheduler.cancelEvent(USER2 + Date.now()).should.equal false

  it 'schedule complex function', (done) ->
    facebookAPI = require '../../src/server/coffee/api/facebookAPI.coffee'
    event = ->
      oauthURL = facebookAPI.getOAuthURL()
      (oauthURL.length).should.be.above 1
      done()
    scheduler.addEventListerner 'event4', event
    date = new Date Date.now() + 1000
    eventId = scheduler.scheduleEvent USER, date, 'event4', ['']
    console.log 'eventId: ', eventId

  it 'save scheduled event in database (then execute it)', (done) ->
    #@sandbox.stub(scheduler, 'scheduleEvent').returns 'fakeId'
    date = new Date Date.now() + 1000
    eventId = null
    event = (eventId, userId, params) ->
      finish params
    finish = (params) ->
      console.log 'late event, eventId: ', eventId
      'late test'.should.equal params[0]
      done()
    scheduler.addEventListerner 'event5', event
    scheduler.saveScheduledEvent USER, date, 'event5', ['late test']
    .then (eventId) ->
      console.log 'eventId? ', eventId
    .catch (err) ->
      console.log 'err in save Scheduled Event: ', err
      done err

  it 'save complex scheduled event in database (then execute it)', (done) ->
    facebookAPI = require '../../src/server/coffee/api/facebookAPI.coffee'
    event = facebookAPI.getOAuthURL
    date = new Date Date.now() + 1000
    scheduler.addEventListerner 'event6', event
    scheduler.saveScheduledEvent USER, date, 'event6', ['']
    .then (result) ->
      console.log 'result? ', result
      done()
    .catch (err) ->
      console.log 'err dans save Scheduled Event: ', err
      done err

  it 'should call eventDao to save event ', (done) ->
    @sandbox.stub(scheduler, 'scheduleEvent').returns 'fakeId'
    scheduler.saveScheduledEvent USER, Date.now(), 'event3', ['lateTest']
    .then (result) ->
      eventId = result
      console.log 'result: ', result
      done()
      #eventsDAO.saveScheduledEvent.should.have.been.called
    .catch (err) ->
      console.log 'err in save Scheduled Event: ', err
      done err

  it 'loadScheduledEvents should call retrieveScheduledEvents and add them in scheduler', ->
    @sandbox.stub(eventsDao, 'retrieveScheduledEvents').returns Promise.resolve ['retrievedEvent']
    @sandbox.stub(scheduler, '_addEventToSchedule').returns []
    scheduler.loadScheduledEvents()
    scheduler._addEventToSchedule.called.should.be.true
