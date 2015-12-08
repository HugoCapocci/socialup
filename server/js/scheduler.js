'use strict';
var schedule = require('node-schedule');
var Q = require('q');
var eventsDAO = require('./eventsDAO.js');

//stocke les évènement programmés, 2 max par user
const MAX_EVENTS = 2;
var scheduleEvents = {};
var events = require('events');

// Create an eventEmitter object
var eventEmitter = new events.EventEmitter();

exports.addEventListerner = function(eventType, listener) {
    eventEmitter.addListener(eventType, listener);
};

// returned job can be canceled : job.cancel()
function scheduleEvent(userId, date, eventType, providers, eventParams, callback) {

    var eventId = userId + '|' + Date.now();

    //job pushed to schedule.scheduledJobs[eventId]
    addEventToSchedule(userId, date, eventType, providers, eventParams, eventId, callback);

    return eventId;
}

function addEventToSchedule(userId, date, eventType, providers, eventParams, eventId, callback) {
    
    //iso database
    if(scheduleEvents[userId]===undefined)
        scheduleEvents[userId] = new Array(MAX_EVENTS);

    schedule.scheduleJob(eventId, date, function() {

        deleteEventFromUser(userId, eventId);          
        var args = [eventType, eventId, userId, providers];
        args = args.concat(eventParams);

        var hasListeners = eventEmitter.emit.apply(eventEmitter, args);
        if(!hasListeners) {
            console.log("pas de listener pour l'event ", eventType);
        }
    });
    scheduleEvents[userId].push(eventId);
}

exports.executeChainedEvent = function(userId, eventType, providers, eventParams, eventId) {

    var args = [eventType, eventId, userId, providers];   
    args = args.concat(eventParams);
    var hasListeners = eventEmitter.emit.apply(eventEmitter, args);
    if(!hasListeners) {
        console.log("pas de listener pour le chained event ", eventType);
    }
};

function cancelEvent(eventId) {
    
    if(schedule.scheduledJobs[eventId]===undefined)
        return false;
    else {
        var user= eventId.split('|')[0];
        schedule.scheduledJobs[eventId].cancel();
        return deleteEventFromUser(user, eventId);
    }
}

function deleteEventFromUser(userId, eventId) {
 
    //console.log("delete event "+eventId+" for user "+user);
    for(var i=0; i<scheduleEvents[userId].length; i++) {
        if(scheduleEvents[userId][i] === eventId) {
            delete scheduleEvents[userId][i];
            return true;
        }
    }
    return false;
}

// db key -> eventId
function saveScheduledEvent(userId, date, eventType, providers, eventParams) {
    var eventId = scheduleEvent(userId, date, eventType, providers, eventParams);
    return eventsDAO.saveScheduledEvent(eventId,userId, date, eventType, providers, eventParams);
}

function loadScheduledEvents() {
    eventsDAO.retrieveScheduledEvents().then(function(results) {
        console.log("events to be scheduled: ",results);
        if(results!==undefined)
            results.forEach(function(result) {
                addEventToSchedule(result.user, new Date(result.dateTime), result.eventType, result.providers, result.eventParams, result.eventId);
            });
    }, function(err) {
        console.log("cannot load events, error occurs: ", err);
    });
}

exports.scheduleEvent=scheduleEvent;
exports.cancelEvent=cancelEvent;
exports.saveScheduledEvent=saveScheduledEvent;
exports.loadScheduledEvents=loadScheduledEvents;