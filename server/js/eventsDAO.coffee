schedule = require('node-schedule')
Q = require('q')
MongoClient = require('mongodb').MongoClient
ObjectID = require('mongodb').ObjectID
uri = process.env.MONGOLAB_URI
scheduledEventsCollection = "scheduledEvents"
chainedEventsCollection = "chainedEvents"
tracedEventsCollection = "tracedEvents"

getDB = (callback) ->
  MongoClient.connect uri, (err, db) ->
    if err
      throw err
    else
      callback(db)
      
createEvent = (eventToSave, collection, callback) ->

  deferred = Q.defer()
  getDB (db) ->
    db.collection(collection).insert eventToSave, (err, result) ->
      db.close()
      if err
        deferred.reject new Error(err)
      else
        if callback isnt undefined
          callback(result)
        deferred.resolve(eventToSave.eventId)

  deferred.promise
  
updateEvent = (query, update, collection) ->

  deferred = Q.defer()
  getDB (db) ->
    db.collection(collection).update query, update, (err, r) ->
      db.close()
      if err
        deferred.reject(err)
      else
        deferred.resolve(r.result.nModified)

  deferred.promise

getEventToSave = (userId, eventType, eventParams, providers, providersOptions) ->
  
  user : userId
  dateTime : (new Date()).getTime()
  eventType : eventType
  eventParams: eventParams
  providers : providers
  providersOptions : providersOptions

deleteEvent = (eventToDelete, collection, callback) ->
  deferred = Q.defer()
  getDB (db) ->
    db.collection(collection).remove eventToDelete, (err, r) ->
      db.close()
      if err
        deferred.reject new Error(err)
      else
        if callback isnt undefined
          callback(r)
        deferred.resolve(r.result.n)

  deferred.promise

retrieveEvent = (query, collection) ->

  deferred = Q.defer()
  getDB (db) ->
    db.collection(collection).findOne query, (err, results) ->
      db.close()
      if err
        deferred.reject new Error(err)
      else
        deferred.resolve(results)

  deferred.promise
  
retrieveEventsByQuery = (query, collection, sortData) ->

  deferred = Q.defer()
  getDB (db) ->
    sort = {}
    if sortData
      sort = {sort:sortData}

    db.collection(collection).find(query, sort).toArray (err, results) ->
      db.close()
      if err
        deferred.reject new Error(err)
      else
        deferred.resolve(results)

  deferred.promise

retrieveEvents = (collection, params) ->

  deferred = Q.defer()
  #no already-executed events only
  query =
    results: {$exists:false}
    error:{$exists:false}

  if params isnt undefined
    for param in params
      query[param.name] = param.value

  getDB (db) ->
    db.collection(collection).find(query).toArray (err, results) ->
      db.close()
      if err
        deferred.reject new Error(err)
      else
        deferred.resolve(results)

  deferred.promise

module.exports = class EventsDAO

  constructor: ->

  #db key -> eventId
  saveScheduledEvent : (eventId, userId, date, eventType, providers, providersOptions, eventParams) ->

    eventToSave =
      user : userId
      dateTime : (new Date(date)).getTime()
      eventType : eventType
      eventParams: eventParams
      providers : providers
      providersOptions : providersOptions
      eventId : eventId
      chainedEventsCounts :0

    createEvent(eventToSave, scheduledEventsCollection)

  createChainedEvent : (eventParentId, userId, eventType, providers, providersOptions, eventParams) ->

    eventToSave =
      user : userId
      eventType : eventType
      eventParams: eventParams
      providers : providers
      eventParentId : eventParentId
      providersOptions : providersOptions

    #async callback : increments chainedEvents count in scheduledEvent
    createEvent eventToSave, chainedEventsCollection, ->
      updateEvent eventParentId, {$inc:{chainedEventsCounts:1}}, scheduledEventsCollection

  createTracedEvent : (userId, eventType, eventParams, providers, providersOptions, results) ->

    eventToSave = getEventToSave(userId, eventType, eventParams, providers, providersOptions)
    eventToSave.results=results
    createEvent(eventToSave, tracedEventsCollection)

  createTracedEventError : (userId, eventType, eventParams, providers, providersOptions, error) ->

    eventToSave = getEventToSave(userId, eventType, eventParams, providers, providersOptions)
    eventToSave.error=error
    createEvent(eventToSave, tracedEventsCollection)

  updateScheduledEvent : (eventId, scheduledEvent) ->
    delete scheduledEvent._id
    updateEvent({eventId:eventId}, scheduledEvent, scheduledEventsCollection)

  updateScheduledEventAfterExecution : (eventId, results) ->
    updateEvent({eventId:eventId}, {$set:{results:results}}, scheduledEventsCollection)

  updateScheduledEventAfterError : (eventId, error) ->
    updateEvent({eventId:eventId}, {$set:{error:error.toString()}}, scheduledEventsCollection)

  updateChainedEventAfterExecution : (eventId, results) ->
    updateEvent({_id : new ObjectID(eventId) }, {$set:{results:results}}, chainedEventsCollection)

  updateChainedEventAfterError : (eventId, error) ->
    updateEvent({_id : new ObjectID(eventId) }, {$set:{error:error.toString()}}, chainedEventsCollection)

  deleteScheduledEvent : (eventId) ->
    deleteEvent({eventId:eventId}, scheduledEventsCollection)

  deleteChainedEvent : (eventId, eventParentId) ->
    eventToDelete =
      _id : new ObjectID(eventId)

    deleteEvent eventToDelete, chainedEventsCollection, (r) ->
      if r.result.ok is 1
        updateEvent(eventParentId, {$inc:{chainedEventsCounts:-1}}, scheduledEventsCollection)

  deleteTracedEvent : (eventId) ->
    eventToDelete =
      _id : new ObjectID(eventId)
    deleteEvent(eventToDelete, tracedEventsCollection)

  #at startup, retrieve all events and put them in scheduler
  retrieveScheduledEvents : ->
    retrieveEvents(scheduledEventsCollection)

  retrieveChainedEvents : (eventId) ->
    retrieveEvents(chainedEventsCollection, [{name : 'eventParentId', value:eventId}])

  retrieveScheduledEventsByUser : (userId) ->
    retrieveEventsByQuery({user:userId}, scheduledEventsCollection, 'dateTime')

  retrieveTracedEventsByUser : (userId) ->
    retrieveEventsByQuery({user:userId},  tracedEventsCollection, 'dateTime')

  ###
  retrieveChainedEvents : (eventParentId) ->
  retrieveEventsByQuery({eventParentId:eventParentId},
  chainedEventsCollection)
  ###

  retrieveScheduledEvent : (eventId) ->
    retrieveEvent({eventId:eventId}, scheduledEventsCollection)

  retrieveChainedEvent : (eventId) ->
    retrieveEvent({_id : new ObjectID(eventId)}, chainedEventsCollection)