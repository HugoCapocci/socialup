chai = require 'chai'
chaiAsPromised = require 'chai-as-promised'
sinonchai = require 'sinon-chai'
chai.use chaiAsPromised
chai.use sinonchai
fs = require 'fs'
should = chai.should
sinon = require 'sinon'

require '../../localeConfig' unless process.env.MONGOLAB_URI?

Promise = require 'bluebird'
EventsDAO = require '../../src/server/coffee/eventsDAO'
eventsDAO = new EventsDAO()

describe 'EventsDAO', ->

  beforeEach ->
    @sandbox = sinon.sandbox.create()
    @sandbox.stub(eventsDAO, 'getDB').returns Promise.resolve
      collection: ->
        insert: -> eventId: 42
        update: -> result: nModified: 7
        findOne: -> 'eventFound'
        find: -> toArray: -> 'eventsFound'
      close: ->

  afterEach ->
    @sandbox.restore()

  it 'createEvent should create new Event', (done) ->
    eventsDAO.createEvent 'dummyEvent', 'dummyCollection'
    .then (createdEventId) ->
      createdEventId.should.equal 42
      done()

  it 'updateEvent should return number of modified events', (done) ->
    eventsDAO.updateEvent 'dummyQuery', 'dummyUpdate', 'dummyCollection'
    .then (nbModifiedEvents) ->
      nbModifiedEvents.should.equal 7
      done()
