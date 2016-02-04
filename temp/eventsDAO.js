var MongoClient, ObjectID, Q, chainedEventsCollection, createEvent, deleteEvent, deleteScheduledEvent, getDB, getEventToSave, retrieveChainedEvent, retrieveEvent, retrieveEvents, retrieveEventsByQuery, retrieveScheduledEvent, retrieveScheduledEvents, retrieveScheduledEventsByUser, saveScheduledEvent, schedule, scheduledEventsCollection, tracedEventsCollection, updateEvent, updateScheduledEventAfterError, updateScheduledEventAfterExecution, uri;

schedule = require('node-schedule');

Q = require('q');

MongoClient = require('mongodb').MongoClient;

ObjectID = require('mongodb').ObjectID;

uri = process.env.MONGOLAB_URI;

scheduledEventsCollection = "scheduledEvents";

chainedEventsCollection = "chainedEvents";

tracedEventsCollection = "tracedEvents";

getDB = function(callback) {
  return MongoClient.connect(uri, function(err, db) {
    if (err) {
      throw err;
    } else {
      return callback(db);
    }
  });
};

saveScheduledEvent = function(eventId, userId, date, eventType, providers, providersOptions, eventParams) {
  var eventToSave;
  eventToSave = {
    user: userId,
    dateTime: (new Date(date)).getTime(),
    eventType: eventType,
    eventParams: eventParams,
    providers: providers,
    providersOptions: providersOptions,
    eventId: eventId,
    chainedEventsCounts: 0
  };
  return createEvent(eventToSave, scheduledEventsCollection);
};

exports.createChainedEvent = function(eventParentId, userId, eventType, providers, providersOptions, eventParams) {
  var eventToSave;
  eventToSave = {
    user: userId,
    eventType: eventType,
    eventParams: eventParams,
    providers: providers,
    eventParentId: eventParentId,
    providersOptions: providersOptions
  };
  return createEvent(eventToSave, chainedEventsCollection, function() {
    return updateEvent(eventParentId, {
      $inc: {
        chainedEventsCounts: 1
      }
    }, scheduledEventsCollection);
  });
};

createEvent = function(eventToSave, collection, callback) {
  var deferred;
  deferred = Q.defer();
  getDB(function(db) {
    return db.collection(collection).insert(eventToSave, function(err, result) {
      db.close();
      if (err) {
        return deferred.reject(new Error(err));
      } else {
        if (callback !== void 0) {
          callback(result);
        }
        return deferred.resolve(eventToSave.eventId);
      }
    });
  });
  return deferred.promise;
};

exports.createTracedEvent = function(userId, eventType, eventParams, providers, providersOptions, results) {
  var eventToSave;
  eventToSave = getEventToSave(userId, eventType, eventParams, providers, providersOptions);
  eventToSave.results = results;
  return createEvent(eventToSave, tracedEventsCollection);
};

exports.createTracedEventError = function(userId, eventType, eventParams, providers, providersOptions, error) {
  var eventToSave;
  eventToSave = getEventToSave(userId, eventType, eventParams, providers, providersOptions);
  eventToSave.error = error;
  return createEvent(eventToSave, tracedEventsCollection);
};

getEventToSave = function(userId, eventType, eventParams, providers, providersOptions) {
  return eventToSave({
    user: userId,
    dateTime: (new Date()).getTime(),
    eventType: eventType,
    eventParams: eventParams,
    providers: providers,
    providersOptions: providersOptions
  });
};

exports.updateScheduledEvent = function(eventId, scheduledEvent) {
  delete scheduledEvent._id;
  return updateEvent({
    eventId: eventId
  }, scheduledEvent, scheduledEventsCollection);
};

updateScheduledEventAfterExecution = function(eventId, results) {
  return updateEvent({
    eventId: eventId
  }, {
    $set: {
      results: results
    }
  }, scheduledEventsCollection);
};

updateScheduledEventAfterError = function(eventId, error) {
  return updateEvent({
    eventId: eventId
  }, {
    $set: {
      error: error.toString()
    }
  }, scheduledEventsCollection);
};

exports.updateChainedEventAfterExecution = function(eventId, results) {
  return updateEvent({
    _id: new ObjectID(eventId)
  }, {
    $set: {
      results: results
    }
  }, chainedEventsCollection);
};

exports.updateChainedEventAfterError = function(eventId, error) {
  return updateEvent({
    _id: new ObjectID(eventId)
  }, {
    $set: {
      error: error.toString()
    }
  }, chainedEventsCollection);
};

updateEvent = function(query, update, collection) {
  var deferred;
  deferred = Q.defer();
  getDB(function(db) {
    return db.collection(collection).update(query, update, function(err, r) {
      db.close();
      if (err) {
        return deferred.reject(err);
      } else {
        return deferred.resolve(r.result.nModified);
      }
    });
  });
  return deferred.promise;
};

deleteScheduledEvent = function(eventId) {
  return deleteEvent({
    eventId: eventId
  }, scheduledEventsCollection);
};

exports.deleteChainedEvent = function(eventId, eventParentId) {
  var eventToDelete;
  eventToDelete = {
    _id: new ObjectID(eventId)
  };
  return deleteEvent(eventToDelete, chainedEventsCollection, function(r) {
    if (r.result.ok === 1) {
      return updateEvent(eventParentId, {
        $inc: {
          chainedEventsCounts: -1
        }
      }, scheduledEventsCollection);
    }
  });
};

exports.deleteTracedEvent = function(eventId) {
  var eventToDelete;
  eventToDelete = {
    _id: new ObjectID(eventId)
  };
  return deleteEvent(eventToDelete, tracedEventsCollection);
};

deleteEvent = function(eventToDelete, collection, callback) {
  var deferred;
  deferred = Q.defer();
  getDB(function(db) {
    return db.collection(collection).remove(eventToDelete, function(err, r) {
      db.close();
      if (err) {
        return deferred.reject(new Error(err));
      } else {
        if (callback !== void 0) {
          callback(r);
        }
        return deferred.resolve(r.result.n);
      }
    });
  });
  return deferred.promise;
};

retrieveScheduledEvents = function() {
  return retrieveEvents(scheduledEventsCollection);
};

exports.retrieveChainedEvents = function(eventId) {
  return retrieveEvents(chainedEventsCollection, [
    {
      name: 'eventParentId',
      value: eventId
    }
  ]);
};

retrieveEvents = function(collection, params) {
  var deferred, i, len, param, query;
  deferred = Q.defer();
  query = {
    results: {
      $exists: false
    },
    error: {
      $exists: false
    }
  };
  if (params !== void 0) {
    for (i = 0, len = params.length; i < len; i++) {
      param = params[i];
      query[param.name] = param.value;
    }
  }
  getDB(function(db) {
    return db.collection(collection).find(query).toArray(function(err, results) {
      db.close();
      if (err) {
        return deferred.reject(new Error(err));
      } else {
        return deferred.resolve(results);
      }
    });
  });
  return deferred.promise;
};

retrieveScheduledEventsByUser = function(userId) {
  return retrieveEventsByQuery({
    user: userId
  }, scheduledEventsCollection, 'dateTime');
};

exports.retrieveTracedEventsByUser = function(userId) {
  return retrieveEventsByQuery({
    user: userId
  }, tracedEventsCollection, 'dateTime');
};

exports.retrieveChainedEvents = function(eventParentId) {
  return retrieveEventsByQuery({
    eventParentId: eventParentId
  }, chainedEventsCollection);
};

retrieveEventsByQuery = function(query, collection, sortData) {
  var deferred;
  deferred = Q.defer();
  getDB(function(db) {
    var sort;
    sort = {};
    if (sortData) {
      sort = {
        sort: sortData
      };
    }
    return db.collection(collection).find(query, sort).toArray(function(err, results) {
      db.close();
      if (err) {
        return deferred.reject(new Error(err));
      } else {
        return deferred.resolve(results);
      }
    });
  });
  return deferred.promise;
};

retrieveScheduledEvent = function(eventId) {
  return retrieveEvent({
    eventId: eventId
  }, scheduledEventsCollection);
};

retrieveChainedEvent = function(eventId) {
  return retrieveEvent({
    _id: new ObjectID(eventId)
  }, chainedEventsCollection);
};

retrieveEvent = function(query, collection) {
  var deferred;
  deferred = Q.defer();
  getDB(function(db) {
    return db.collection(collection).findOne(query, function(err, results) {
      db.close();
      if (err) {
        return deferred.reject(new Error(err));
      } else {
        return deferred.resolve(results);
      }
    });
  });
  return deferred.promise;
};

exports.saveScheduledEvent = saveScheduledEvent;

exports.deleteScheduledEvent = deleteScheduledEvent;

exports.retrieveScheduledEventsByUser = retrieveScheduledEventsByUser;

exports.updateScheduledEventAfterExecution = updateScheduledEventAfterExecution;

exports.updateScheduledEventAfterError = updateScheduledEventAfterError;

exports.retrieveScheduledEvent = retrieveScheduledEvent;

exports.retrieveChainedEvent = retrieveChainedEvent;

exports.retrieveScheduledEvents = retrieveScheduledEvents;
