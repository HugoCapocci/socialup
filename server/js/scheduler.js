'use strict';
var schedule = require('node-schedule');
var Q = require('q');
var MongoClient = require('mongodb').MongoClient;

//stocke les évènement programmés, 2 max par user

// returned job can be canceled : job.cancel()
function scheduleEvent(/*user,*/date, event, eventParams) {
    
    var job = schedule.scheduleJob(date, function() {
        event.apply(null, eventParams);
    });
    //TODO: store job for user
    return job;
}

function saveScheduledEvent(user, date, event, eventParams) {
    
    
    
}

exports.scheduleEvent=scheduleEvent;