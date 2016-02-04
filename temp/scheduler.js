var MAX_EVENTS, Q, addEventToSchedule, cancelEvent, deleteEventFromUser, eventEmitter, events, eventsDAO, loadScheduledEvents, saveScheduledEvent, schedule, scheduleEvent, scheduleEvents;

schedule = require('node-schedule');

Q = require('q');

eventsDAO = require('./eventsDAO.js');

MAX_EVENTS = 2;

scheduleEvents = {};

events = require('events');

eventEmitter = new events.EventEmitter();

exports.addEventListerner = function(eventType, listener) {
  return eventEmitter.addListener(eventType, listener);
};

scheduleEvent = function(userId, date, eventType, providers, providersOptions, eventParams, callback) {
  var eventId;
  eventId = userId + '|' + Date.now();
  addEventToSchedule(userId, date, eventType, providers, providersOptions, eventParams, eventId, callback);
  return eventId;
};

addEventToSchedule = function(userId, date, eventType, providers, providersOptions, eventParams, eventId, callback) {
  if (scheduleEvents[userId] === void 0) {
    scheduleEvents[userId] = new Array(MAX_EVENTS);
  }
  schedule.scheduleJob(eventId, date, function() {
    var args, hasListeners;
    deleteEventFromUser(userId, eventId);
    args = [eventType, eventId, userId, providers, providersOptions];
    args = args.concat(eventParams);
    hasListeners = eventEmitter.emit.apply(eventEmitter, args);
    if (!hasListeners) {
      return console.log("no listener for event: ", eventType);
    }
  });
  return scheduleEvents[userId].push(eventId);
};

exports.executeChainedEvent = function(userId, eventType, providers, providersOptions, eventParams, eventId) {
  var args, hasListeners;
  args = [eventType, eventId, userId, providers];
  args = args.concat(eventParams);
  hasListeners = eventEmitter.emit.apply(eventEmitter, args);
  if (!hasListeners) {
    return console.log("no listener for chained event: ", eventType);
  }
};

cancelEvent = function(eventId) {
  var user;
  if (schedule.scheduledJobs[eventId] === void 0) {
    return false;
  } else {
    user = eventId.split('|')[0];
    schedule.scheduledJobs[eventId].cancel();
    return deleteEventFromUser(user, eventId);
  }
};

deleteEventFromUser = function(userId, eventId) {
  var i, j, ref;
  console.log('deleteEventFromUser');
  for (i = j = 0, ref = scheduleEvents[userId].length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
    if (scheduleEvents[userId][i] === eventId) {
      delete scheduleEvents[userId][i];
      return true;
    }
  }
  return false;
};

saveScheduledEvent = function(userId, date, eventType, providers, providersOptions, eventParams) {
  var eventId;
  eventId = scheduleEvent(userId, date, eventType, providers, providersOptions, eventParams);
  return eventsDAO.saveScheduledEvent(eventId, userId, date, eventType, providers, providersOptions, eventParams);
};

loadScheduledEvents = function() {
  return eventsDAO.retrieveScheduledEvents().then(function(results) {
    var j, len, result, results1;
    if (results !== void 0) {
      results1 = [];
      for (j = 0, len = results.length; j < len; j++) {
        result = results[j];
        results1.push(addEventToSchedule(result.user, new Date(result.dateTime), result.eventType, result.providers, result.providersOptions, result.eventParams, result.eventId));
      }
      return results1;
    }
  }, function(err) {
    return console.log("cannot load events, error occurs: ", err);
  });
};

exports.scheduleEvent = scheduleEvent;

exports.cancelEvent = cancelEvent;

exports.saveScheduledEvent = saveScheduledEvent;

exports.loadScheduledEvents = loadScheduledEvents;
