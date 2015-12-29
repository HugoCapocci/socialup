'use strict';
var schedule = require('node-schedule');
var Q = require('q');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

var uri = process.env.MONGOLAB_URI;
var scheduledEventsCollection = "scheduledEvents";
var chainedEventsCollection = "chainedEvents";
var tracedEventsCollection = "tracedEvents";

function getDB(callback) {
     MongoClient.connect(uri, function(err, db) {
         if(err)
             throw err;
         else
             callback(db);
     });
}

// db key -> eventId
function saveScheduledEvent(eventId, userId, date, eventType, providers, providersOptions, eventParams) {

    var eventToSave = {
        user : userId,
        dateTime : (new Date(date)).getTime(),
        eventType : eventType,
        eventParams: eventParams,
        providers : providers,
        providersOptions : providersOptions,
        eventId : eventId,
        chainedEventsCounts :0
    };
    return createEvent(eventToSave, scheduledEventsCollection);
}
exports.createChainedEvent = function(eventParentId, userId, eventType, providers, providersOptions, eventParams) {

    var eventToSave = {
        user : userId,
        eventType : eventType,
        eventParams: eventParams,
        //Ids of 
        /*chainedParams: chainedParams,*/
        providers : providers,
        eventParentId : eventParentId,
        providersOptions : providersOptions
    };

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

exports.createTracedEvent = function(userId, eventType, eventParams, providers, providersOptions, results) {
    
    var eventToSave = getEventToSave(userId, eventType, eventParams, providers, providersOptions);
    eventToSave.results=results;
    return createEvent(eventToSave, tracedEventsCollection);
};
exports.createTracedEventError = function(userId, eventType, eventParams, providers, providersOptions, error) {
    
    var eventToSave = getEventToSave(userId, eventType, eventParams, providers, providersOptions);
    eventToSave.error=error;
    return createEvent(eventToSave, tracedEventsCollection);
};
function getEventToSave(userId, eventType, eventParams, providers, providersOptions) {
        
    return {
        user : userId,
        dateTime : (new Date()).getTime(),
        eventType : eventType,
        eventParams: eventParams,
        providers : providers,
        providersOptions : providersOptions
    };
}

exports.updateScheduledEvent = function(eventId, scheduledEvent) {
    delete scheduledEvent._id;
    return updateEvent({eventId:eventId}, scheduledEvent, scheduledEventsCollection);
};
function updateScheduledEventAfterExecution(eventId, results) {
    return updateEvent({eventId:eventId}, {$set:{results:results}}, scheduledEventsCollection);
}
function updateScheduledEventAfterError(eventId, error) { 
    return updateEvent({eventId:eventId}, {$set:{error:error.toString()}}, scheduledEventsCollection);
}
exports.updateChainedEventAfterExecution = function (eventId, results) {
    return updateEvent({_id : new ObjectID(eventId) }, {$set:{results:results}}, chainedEventsCollection);
};
exports.updateChainedEventAfterError = function (eventId, error) {
    return updateEvent({_id : new ObjectID(eventId) }, {$set:{error:error.toString()}}, chainedEventsCollection);
};
function updateEvent(query, update, collection) {

    var deferred = Q.defer();
    getDB(function(db) {
        //console.log('update event '+eventId+' with update: ', update);
        db.collection(collection).update(query, update, function(err, r) {
            db.close();
            if(err)
                deferred.reject(err);
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

exports.deleteTracedEvent = function(eventId) {
    var eventToDelete = {
        _id : new ObjectID(eventId)            
    };
    return deleteEvent(eventToDelete, tracedEventsCollection);
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
    return retrieveEventsByQuery({user:userId}, scheduledEventsCollection, 'dateTime');
}
exports.retrieveTracedEventsByUser = function(userId) {
    return retrieveEventsByQuery({user:userId},  tracedEventsCollection, 'dateTime');
};
exports.retrieveChainedEvents = function(eventParentId) {
    return retrieveEventsByQuery({eventParentId:eventParentId}, chainedEventsCollection);
};
function retrieveEventsByQuery(query, collection, sortData) {
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