'use strict';
var schedule = require('node-schedule');
var Q = require('q');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

//stocke les évènement programmés, 2 max par user
const MAX_EVENTS = 2;
var uri = process.env.MONGOLAB_URI;
var collection = "scheduledEvents";
var scheduleEvents = {};
var events = require('events');

// Create an eventEmitter object
var eventEmitter = new events.EventEmitter();

exports.addEventListerner = function(event, listener) {
    eventEmitter.addListener(event, listener);
};

// returned job can be canceled : job.cancel()
function scheduleEvent(userId, date, event, eventParams, callback) {

    var eventId = userId + '|' + Date.now();

    //job pushed to schedule.scheduledJobs[eventId]
    addEventToSchedule(userId, date, event, eventParams, eventId, callback);

    return eventId;
}

function addEventToSchedule(userId, date, eventName, eventParams, eventId, callback) {
    
    //iso database
    if(scheduleEvents[userId]===undefined)
        scheduleEvents[userId] = new Array(MAX_EVENTS);
    
    schedule.scheduleJob(eventId, date, function() {

        deleteEventFromUser(userId, eventId);
        // console.log("eventName found? ", eventName);            
        var args = [eventName, eventId, userId];
        args = args.concat(eventParams);
        // console.log("args? ", args);

        var hasListeners = eventEmitter.emit.apply(eventEmitter, args);
        if(!hasListeners) {
            console.log("pas de listener pour l'event ", eventName);
        }
    });
    scheduleEvents[userId].push(eventId);
}

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
function saveScheduledEvent(userId, date, type, params) {

    var deferred = Q.defer();
    var eventToSave = {
        user : userId,
        dateTime : (new Date(date)).getTime(),
        event : type,
        eventParams: params
    };

    getDB(function(db) {
        var eventId = eventToSave.eventId = scheduleEvent(userId, date, type, params);
        //console.log("eventToSave? ", eventToSave);
        db.collection(collection).insert(eventToSave, function (err/*, result*/) {
            db.close();
            if (err)
                deferred.reject(new Error(err));
            else {                    
                deferred.resolve(eventId);
            }
        });
        
    });
    return deferred.promise;
}

function updateEventAfterExecution(eventId, results) {
    return updateEvent(eventId, {results:results});
}

function updateEventAfterError(eventId, error) { 
    return updateEvent(eventId, {error:error.toString()});
}

function updateEvent(eventId, update) {

    var deferred = Q.defer();
    getDB(function(db) {
        console.log('update event '+eventId+' with update: ', update);
        db.collection(collection).update({eventId:eventId}, {$set:update}, function(err, r) {
          
            db.close();
            if(err)
                deferred.reject(new Error(err));
            else {
                console.log("event updated ?", r.result);
                deferred.resolve(r.result.nModified);
            }                
        });
    });
    return deferred.promise;   
}

function getDB(callback) {
     MongoClient.connect(uri, function(err, db) {
         if(err)
             throw err;
         else
             callback(db);
     });
}

function deleteScheduledEvent(eventId) {

    var deferred = Q.defer();

    getDB(function(db) {
        var eventToDelete = {eventId:eventId};
        // console.log("delete object? ", eventToDelete);
         db.collection(collection).remove(eventToDelete, function(err, r) {
            db.close();
            if (err)
                deferred.reject(new Error(err));
            else {
                //console.log("result: ",r.result);
                deferred.resolve(r.result.n);
            }
        });
    });
    return deferred.promise;
}

//at startup, retrieve all events and put them in scheduler
function retrieveEvents() {
    var deferred = Q.defer();

    getDB(function(db) {
        db.collection(collection).find({results: {$exists:false}}).toArray(function(err, results) { 
            db.close();
            if (err)
                deferred.reject(new Error(err));
            else {
                deferred.resolve(results);
            }
        });
    });
    return deferred.promise;
}

function retrieveEventsByUser(userId) {
    var deferred = Q.defer();

    getDB(function(db) {
        db.collection(collection).find({user:userId}, {sort:'dateTime'}).toArray(function(err, results) { 
            db.close();
            if (err)
                deferred.reject(new Error(err));
            else {
                //console.log("results: ",results);
                deferred.resolve(results);
            }
        });
    });
    return deferred.promise;
}

function retrieveEvent(eventId) {
    var deferred = Q.defer();

    getDB(function(db) {
        db.collection(collection).findOne({eventId:eventId}, function(err, results) { 
            db.close();
            if (err)
                deferred.reject(new Error(err));
            else {
                //console.log("results: ",results);
                deferred.resolve(results);
            }
        });
    });
    return deferred.promise;
}

function loadScheduledEvents() {
    retrieveEvents().then(function(results) {
        console.log("events to be scheduled: ",results);
        if(results!==undefined)
            results.forEach(function(result) {
                addEventToSchedule(result.user, new Date(result.dateTime), result.event, result.eventParams, result.eventId);
            });
    }, function(err) {
        console.log("cannot load events, error occurs: ", err);
    });
}

exports.scheduleEvent=scheduleEvent;
exports.cancelEvent=cancelEvent;
exports.saveScheduledEvent=saveScheduledEvent;
exports.deleteScheduledEvent=deleteScheduledEvent;
exports.loadScheduledEvents=loadScheduledEvents;
exports.retrieveEventsByUser=retrieveEventsByUser;
exports.updateEventAfterExecution=updateEventAfterExecution;
exports.updateEventAfterError=updateEventAfterError;
exports.retrieveEvent=retrieveEvent;