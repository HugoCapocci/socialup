'use strict';
var schedule = require('node-schedule');
var Q = require('q');
var MongoClient = require('mongodb').MongoClient;

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
function scheduleEvent(user, date, event, eventParams, callback) {

    var eventId = user + '|' + Date.now();

    //job pushed to schedule.scheduledJobs[eventId]
    addEventToSchedule(user, date, event, eventParams, eventId, callback);

    return eventId;
}

function addEventToSchedule(user, date, eventName, eventParams, eventId, callback) {
    
    //iso database
    if(scheduleEvents[user]===undefined)
        scheduleEvents[user] = new Array(MAX_EVENTS);
    
    schedule.scheduleJob(eventId, date, function() {

        deleteEventFromUser(user, eventId);
        // console.log("eventName found? ", eventName);            
        var args = [eventName, eventId];
        args = args.concat(eventParams);
        // console.log("args? ", args);

        var hasListeners = eventEmitter.emit.apply(eventEmitter, args);
        if(!hasListeners) {
            console.log("pas de listener pour l'event ", event);
        }
        
        /*var result = event.apply(null, eventParams);
        if(callback!==undefined && callback instanceof Function)
            callback(result);
        
        if(result!==undefined)
            // Promises case
            if(result.then !== undefined && result.then instanceof Function) {
                result.then(function(result) {
                    console.log("scheduled event async result: ",result);
                    // process job execution notes in database
                    updateEventAfterExecution(eventId, result);
                }, function(err) {
                     console.log("scheduled event async err: ",err);
                    //process error in database
                });
            } else {
                console.log("scheduled event sync result: ",result);
                updateEventAfterExecution(eventId, result);
            }*/

    });
    scheduleEvents[user].push(eventId);
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

function deleteEventFromUser(user, eventId) {
 
    //console.log("delete event "+eventId+" for user "+user);
    for(var i=0; i<scheduleEvents[user].length; i++) {
        if(scheduleEvents[user][i] === eventId) {
            delete scheduleEvents[user][i];
            return true;
        }
    }
    return false;
}

// db key -> eventId
function saveScheduledEvent(user, date, event, eventParams) {

    var deferred = Q.defer();
    
    var eventToSave = {
        user : user,
        date : date,
        event : event,
        eventParams: eventParams
    };

    getDB(function(db) {
        var eventId = eventToSave.eventId = scheduleEvent(user, date, event, eventParams);
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

function updateEventAfterExecution(eventId, result) {
    
    var deferred = Q.defer();
    getDB(function(db) {
        //console.log('update event '+eventId+' with result: ', result);
        db.collection(collection).update({eventId:eventId}, {$set:{result:result} }, function(err, r) {
            //console.log("event updated ?", r);
            db.close();
            if(err)
                deferred.reject(new Error(err));
            else
                deferred.resolve(r.result.nModified);
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
        db.collection(collection).find({result: {$exists:false}}).toArray(function(err, results) { 
            db.close();
            if (err)
                deferred.reject(new Error(err));
            else {
                console.log("results: ",results);
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
                addEventToSchedule(result.user, result.date, result.event, result.eventParams, result.eventId);
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
exports.updateEventAfterExecution=updateEventAfterExecution;