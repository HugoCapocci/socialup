'use strict';
var schedule = require('node-schedule');
var Q = require('q');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

var uri = process.env.MONGOLAB_URI;
var scheduledEventsCollection = "scheduledEvents";
var chainedEventsCollection = "chainedEvents";

function getDB(callback) {
     MongoClient.connect(uri, function(err, db) {
         if(err)
             throw err;
         else
             callback(db);
     });
}

// db key -> eventId
function saveScheduledEvent(eventId, userId, date, eventType, providers, eventParams) {

    var eventToSave = {
        user : userId,
        dateTime : (new Date(date)).getTime(),
        eventType : eventType,
        eventParams: eventParams,
        providers : providers,
        eventId : eventId,
        chainedEventsCounts :0
    };
    return createEvent(eventToSave, scheduledEventsCollection); 
}
exports.createChainedEvent = function(eventParentId, userId, eventType, providers, eventParams, messageProvidersOptions) {

    var eventToSave = {
        user : userId,
        eventType : eventType,
        eventParams: eventParams,
        //Ids of 
        /*chainedParams: chainedParams,*/
        providers : providers,
        eventParentId : eventParentId
    };
    
    if(messageProvidersOptions)
        eventToSave.messageProvidersOptions=messageProvidersOptions;
    // async callback : increments chainedEvents count in scheduledEvent
    return createEvent(eventToSave, chainedEventsCollection, function() {
        updateEvent(eventParentId, {$inc:{chainedEventsCounts:1}}, scheduledEventsCollection);
    }); 
};

function createEvent(eventToSave, collection, callback) {

    var deferred = Q.defer();
    getDB(function(db) {
         //console.log("eventToSave? ", eventToSave);
        db.collection(collection).insert(eventToSave, function (err, result) {
            db.close();
            if (err)
                deferred.reject(new Error(err));
            else {
                if(callback!==undefined)
                    callback(result);
                deferred.resolve(eventToSave.eventId);
            }
        });        
    });
    return deferred.promise;
}

exports.updateScheduledEvent = function(eventId, scheduledEvent) {
    delete scheduledEvent._id;
    return updateEvent(eventId, scheduledEvent, scheduledEventsCollection);
};
function updateScheduledEventAfterExecution(eventId, results) {
    return updateEvent(eventId, {$set:{results:results}}, scheduledEventsCollection);
}
function updateScheduledEventAfterError(eventId, error) { 
    return updateEvent(eventId, {$set:{error:error.toString()}}, scheduledEventsCollection);
}
exports.updateChainedsEventAfterExecution = function (eventId, results) {
    return updateEvent(eventId, {$set:{results:results}}, chainedEventsCollection);
};
exports.updateChainedsEventAfterError = function (eventId, error) {
    return updateEvent(eventId, {$set:{error:error.toString()}}, chainedEventsCollection);
};
function updateEvent(eventId, update, collection) {

    var deferred = Q.defer();
    getDB(function(db) {
        //console.log('update event '+eventId+' with update: ', update);
        db.collection(collection).update({eventId:eventId}, update, function(err, r) {
            db.close();
            if(err)
                deferred.reject(new Error(err));
            else {
                //console.log("event updated ?", r.result);
                deferred.resolve(r.result.nModified);
            }                
        });
    });
    return deferred.promise;   
}

function deleteScheduledEvent(eventId) {
    return deleteEvent({eventId:eventId}, scheduledEventsCollection);
}
exports.deleteChainedEvent = function(eventId, eventParentId) {
    var eventToDelete = {
        _id : new ObjectID(eventId)            
    };
    return deleteEvent(eventToDelete, chainedEventsCollection, function(r) {
        if(r.result.ok===1)
            updateEvent(eventParentId, {$inc:{chainedEventsCounts:-1}}, scheduledEventsCollection);
    });
};
function deleteEvent(eventToDelete, collection, callback) {
    var deferred = Q.defer();
    getDB(function(db) {
        db.collection(collection).remove(eventToDelete, function(err, r) {
            db.close();
            if (err)
                deferred.reject(new Error(err));
            else {
                if(callback !==undefined)
                    callback(r);
                deferred.resolve(r.result.n);
            }
        });
    });
    return deferred.promise;
}
//at startup, retrieve all events and put them in scheduler
function retrieveScheduledEvents() {
    return retrieveEvents(scheduledEventsCollection);
}
exports.retrieveChainedEvents = function(eventId) {
  return retrieveEvents(chainedEventsCollection, [{name : 'eventParentId', value:eventId}]);  
};
function retrieveEvents(collection, params) {
    
    var deferred = Q.defer();
    // no already-executed events only
    var query={
        results: {$exists:false}, 
        error:{$exists:false}
    };
    if(params!==undefined) {
        params.forEach(function(param) {
            query[param.name] = param.value;
        });
    }
    getDB(function(db) {
        db.collection(collection).find(query).toArray(function(err, results) { 
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

function retrieveScheduledEventsByUser(userId) {
    return retrieveEventsByUser({user:userId}, scheduledEventsCollection, 'dateTime');
}
exports.retrieveChainedEvents = function(eventParentId) {
    return retrieveEventsByUser({eventParentId:eventParentId}, chainedEventsCollection);
};
function retrieveEventsByUser(query, collection, sortData) {
    var deferred = Q.defer();
    getDB(function(db) {
        var sort = {};
        if(sortData) {
            sort = {sort:sortData};
        }
        db.collection(collection).find(query, sort).toArray(function(err, results) { 
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

function retrieveScheduledEvent(eventId) {
    return retrieveEvent({eventId:eventId}, scheduledEventsCollection);
}
function retrieveChainedEvent(eventId) {
    return retrieveEvent({_id : new ObjectID(eventId)}, chainedEventsCollection);
}
function retrieveEvent(query, collection) {
    var deferred = Q.defer();
    getDB(function(db) {
        db.collection(collection).findOne(query, function(err, results) { 
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
 
exports.saveScheduledEvent=saveScheduledEvent;
exports.deleteScheduledEvent=deleteScheduledEvent; 
exports.retrieveScheduledEventsByUser=retrieveScheduledEventsByUser;
exports.updateScheduledEventAfterExecution=updateScheduledEventAfterExecution;
exports.updateScheduledEventAfterError=updateScheduledEventAfterError;
exports.retrieveScheduledEvent=retrieveScheduledEvent;
exports.retrieveChainedEvent=retrieveChainedEvent;
exports.retrieveScheduledEvents=retrieveScheduledEvents;