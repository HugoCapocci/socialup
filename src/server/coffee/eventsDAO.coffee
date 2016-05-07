schedule = require 'node-schedule'
Promise = require 'bluebird'
MongoDB = require 'mongodb'
Promise.promisifyAll MongoDB
MongoClient = MongoDB.MongoClient
Promise.promisifyAll MongoClient
ObjectID = MongoDB.ObjectID
scheduledEventsCollection = 'scheduledEvents'
chainedEventsCollection = 'chainedEvents'
tracedEventsCollection = 'tracedEvents'

module.exports = class EventsDAO
  constructor: ->

  getDB: ->
    MongoClient.connect process.env.MONGOLAB_URI

  createEvent: (eventToSave, collection) ->
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).insert eventToSave
    .then (eventSaved) ->
      eventSaved.eventId

  updateEvent: (query, update, collection) ->
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).update query, update
    .then (r) ->
      @db.close()
      r.result.nModified

  getEventToSave: (userId, eventType, eventParams, providers, providersOptions) ->
    user: userId
    dateTime: (new Date()).getTime()
    eventType: eventType
    eventParams: eventParams
    providers: providers
    providersOptions: providersOptions

  deleteEvent: (eventToDelete, collection) ->
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).remove eventToDelete
    .then (r) ->
      @db.close()
      r.result.n

  retrieveEvent: (query, collection) ->
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).findOne query
    .then (events) ->
      @db.close()
      results

  retrieveEventsByQuery: (query, collection, sortData) ->
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      sort = {}
      sort = sort: sortData   if sortData
      @db.collection(collection).find(query, sort).toArray()
    .then (results) ->
      @db.close()
      results

  retrieveEvents: (collection, params) ->
    #no already-executed events only
    query =
      results: $exists: false
      error: $exists: false
    if params isnt undefined
      for param in params
        query[param.name] = param.value
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).find(query).toArray()
    .then (results) ->
      @db.close()
      results

  #services

  #db key -> eventId
  saveScheduledEvent: (eventId, userId, date, eventType, providers, providersOptions, eventParams) ->
    console.log 'saveScheduledEvent non stubbed :/'
    eventToSave =
      user: userId
      dateTime: (new Date date).getTime()
      eventType: eventType
      eventParams: eventParams
      providers: providers
      providersOptions: providersOptions
      eventId: eventId
      chainedEventsCounts :0
    @createEvent eventToSave, scheduledEventsCollection

  createChainedEvent: (eventParentId, userId, eventType, providers, providersOptions, eventParams) ->
    eventToSave =
      user: userId
      eventType: eventType
      eventParams: eventParams
      providers: providers
      eventParentId: eventParentId
      providersOptions: providersOptions
    #async callback : increments chainedEvents count in scheduledEvent
    @createEvent eventToSave, chainedEventsCollection
    .then ->
      @updateEvent eventParentId, $inc: chainedEventsCounts: 1, scheduledEventsCollection

  createTracedEvent: (userId, eventType, eventParams, providers, providersOptions, results) ->
    eventToSave = @getEventToSave userId, eventType, eventParams, providers, providersOptions
    eventToSave.results = results
    @createEvent eventToSave, tracedEventsCollection

  createTracedEventError: (userId, eventType, eventParams, providers, providersOptions, error) ->
    eventToSave = @getEventToSave userId, eventType, eventParams, providers, providersOptions
    eventToSave.error = error
    @createEvent eventToSave, tracedEventsCollection

  updateScheduledEvent: (eventId, scheduledEvent) ->
    delete scheduledEvent._id
    @updateEvent eventId: eventId, scheduledEvent, scheduledEventsCollection

  updateScheduledEventAfterExecution: (eventId, results) ->
    @updateEvent eventId: eventId, $set:{results: results}, scheduledEventsCollection

  updateScheduledEventAfterError: (eventId, error) ->
    @updateEvent eventId: eventId, $set: {error: error.toString()}, scheduledEventsCollection

  updateChainedEventAfterExecution: (eventId, results) ->
    @updateEvent _id: new ObjectID eventId, $set: {results: results}, chainedEventsCollection

  updateChainedEventAfterError: (eventId, error) ->
    @updateEvent _id : new ObjectID eventId, $set: {error: error.toString()}, chainedEventsCollection

  deleteScheduledEvent: (eventId) ->
    @deleteEvent eventId: eventId, scheduledEventsCollection

  deleteChainedEvent: (eventId, eventParentId) ->
    eventToDelete =
      _id: new ObjectID eventId
    @deleteEvent eventToDelete, chainedEventsCollection
    .then (r) ->
      if r.result.ok is 1
        @updateEvent eventParentId, $inc:{chainedEventsCounts:-1}, scheduledEventsCollection

  deleteTracedEvent: (eventId) ->
    eventToDelete =
      _id: new ObjectID eventId
    @deleteEvent eventToDelete, tracedEventsCollection

  #at startup, retrieve all events and put them in scheduler
  retrieveScheduledEvents: ->
    @retrieveEvents scheduledEventsCollection

  retrieveChainedEvents: (eventId) ->
    @retrieveEvents chainedEventsCollection, [{name: 'eventParentId', value: eventId}]

  retrieveScheduledEventsByUser: (userId) ->
    @retrieveEventsByQuery user: userId, scheduledEventsCollection, 'dateTime'

  retrieveTracedEventsByUser: (userId) ->
    @retrieveEventsByQuery user: userId, tracedEventsCollection, 'dateTime'

  ###
  retrieveChainedEvents : (eventParentId) ->
  retrieveEventsByQuery({eventParentId:eventParentId},
  chainedEventsCollection)
  ###
  retrieveScheduledEvent: (eventId) ->
    @retrieveEvent eventId: eventId, scheduledEventsCollection

  retrieveChainedEvent: (eventId) ->
    @retrieveEvent _id: new ObjectID eventId , chainedEventsCollection
