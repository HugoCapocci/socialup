schedule = require 'node-schedule'
EventsDAO = require './eventsDAO'
eventsDAO = new EventsDAO()
#stocke les évènement programmés, 2 max par user
MAX_EVENTS = 2
scheduleEvents = {}
events = require 'events'

#Create an eventEmitter object
eventEmitter = new events.EventEmitter()

exports.addEventListerner = (eventType, listener) ->
  #console.log 'addEventListerner: eventType? ',eventType
  eventEmitter.addListener eventType, listener

#returned job can be canceled : job.cancel()
scheduleEvent = (userId, date, eventType, providers, providersOptions, eventParams, callback) ->
  eventId = userId + '|' + Date.now()
  #job pushed to schedule.scheduledJobs[eventId]
  addEventToSchedule(userId, date, eventType, providers, providersOptions, eventParams, eventId, callback)
  eventId

addEventToSchedule = (userId, date, eventType, providers, providersOptions, eventParams, eventId, callback) ->
  #console.log 'addEventToSchedule'
  #iso database
  if not scheduleEvents[userId]?
    scheduleEvents[userId] = new Array MAX_EVENTS
  scheduledFunction = ->
    #deleteEventFromUser(userId, eventId)
    args = [eventType, eventId, userId, providers, providersOptions]
    args = args.concat eventParams
    hasListeners = eventEmitter.emit.apply eventEmitter, args
    if not hasListeners
      console.log 'no listener for event: ', eventType
  schedule.scheduleJob eventId, date, scheduledFunction, ->
    delete schedule.scheduledJobs[eventId]
  scheduleEvents[userId].push eventId
  return

exports.executeChainedEvent = (userId, eventType, providers, providersOptions, eventParams, eventId) ->
  args = [eventType, eventId, userId, providers]
  args = args.concat eventParams
  hasListeners = eventEmitter.emit.apply eventEmitter, args
  if not hasListeners
    console.log 'no listener for chained event: ', eventType

cancelEvent = (eventId) ->
  if schedule.scheduledJobs[eventId] is undefined
    return false
  else
    user = eventId.split('|')[0]
    schedule.scheduledJobs[eventId].cancel()
    deleteEventFromUser user, eventId

deleteEventFromUser = (userId, eventId) ->
  #console.log 'deleteEventFromUser'
  for i in [0..scheduleEvents[userId].length - 1]
    if scheduleEvents[userId][i] is eventId
      delete scheduleEvents[userId][i]
      return true
  false
#db key -> eventId
saveScheduledEvent = (userId, date, eventType, providers, providersOptions, eventParams) ->
  eventId = scheduleEvent userId, date, eventType, providers, providersOptions, eventParams
  eventsDAO.saveScheduledEvent eventId,userId, date, eventType, providers, providersOptions, eventParams

loadScheduledEvents = ->
  eventsDAO.retrieveScheduledEvents()
  .then (results) ->
    if results isnt undefined
      for result in results
        addEventToSchedule result.user, new Date(result.dateTime), result.eventType, result.providers,
          result.providersOptions, result.eventParams, result.eventId
  .catch (error) ->
    console.log 'cannot load events, error occurs: ', error

exports.scheduleEvent = scheduleEvent
exports.cancelEvent = cancelEvent
exports.saveScheduledEvent = saveScheduledEvent
exports.loadScheduledEvents = loadScheduledEvents
