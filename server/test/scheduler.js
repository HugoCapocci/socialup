var fs = require('fs');
var moment = require('moment');
var should = require('should');

if(process.env.MONGOLAB_URI===undefined)
    try {
        require('../../localeConfig.js');
    } catch (error) {
        console.warn("No configuration file found");
    }
var scheduler = require('../js/scheduler.js');

describe("schedule events service", function() {
    
    const USER = 'test_user';
    const USER2 = 'test_user_bis';
    
    after(function(done) {

        this.timeout(10000);
        // empty collection after tests
        var MongoClient = require('mongodb').MongoClient;      
        MongoClient.connect(process.env.MONGOLAB_URI, function(err, db) {
            db.collection("scheduledEvents").remove({}, function() {
                db.close();
                done();
            });
        });
    });

    it("schedule event with 1 parameter only", function(done) {
        // old date so job will be executed directly
        var date = new Date(2012, 10, 29, 10, 30, 0);
        var event = function(eventId, userId, param) {
            console.log("event avec param: ", param);
            should(param).be.exactly("test");
            done();
        };
        //function scheduleEvent(userId, date, event, eventParams, callback) {
        scheduler.addEventListerner("event1", event);
        var eventId = scheduler.scheduleEvent(USER, date, "event1", "test");
        console.log("eventId: ",eventId);
    });

    it("schedule event with 3 parameters", function(done) {
        // old date so job will be executed directly
        var date = new Date(2012, 10, 29, 10, 30, 0);
        var event = function(eventId, userId, params) {
            should(params[0]).be.exactly("test1");
            should(params[1]).be.exactly("test2");
            should(params[2]).be.exactly("test3");
            done();
        };
        scheduler.addEventListerner("event2", event);
        var eventId = scheduler.scheduleEvent(USER, date, "event2", ["test1", "test2", "test3"]);
        console.log("eventId: ",eventId);
    });
    
    it("schedule late event", function(done) {
        this.timeout(3000);
        // newer date        
        var date = new Date(Date.now() + 1500);
        var eventId;
        var event = function(eventId, userId, params) {
            console.log("late event");
            should(params[0]).be.exactly("late test");
            //event cannot be cancelled anymore, since it has been executed
            scheduler.cancelEvent(eventId).should.equal(false);
            done();            
        };
        scheduler.addEventListerner("event3", event);
        eventId = scheduler.scheduleEvent(USER, date, "event3", ["late test"]);
        console.log("eventId: ",eventId);
    });
    
    it("schedule late event then cancel it", function() {
        // newer date
        var date = new Date(Date.now() + 3000000);
        var eventId = scheduler.scheduleEvent(USER, date, null, [""]);
        console.log("eventId: ",eventId);
        scheduler.cancelEvent(eventId).should.equal(true);
    });

    it("cancel non existing event should return false", function() {
        scheduler.cancelEvent(USER2+Date.now()).should.equal(false);
    });
    
    it("schedule complex function", function(done) {

        var facebookAPI = require('../js/api/facebookAPI.js');
        var event = function() {
            var oauthURL = facebookAPI.getOAuthURL();
            (oauthURL.length).should.be.above(1);
            done();
        };
        scheduler.addEventListerner("event4", event);
        var date = new Date(Date.now() - 1500);
        var eventId = scheduler.scheduleEvent(USER, date, "event4", [""]);

    });
    
    it("save scheduled event in database (then execute it)", function(done) {
        this.timeout(5000);
     
        var date = new Date(Date.now() + 3000);
        var eventId;
        var event = function(eventId, userId, params) {
            finish(params);
        };

        function finish(params) {
            console.log("late event, eventId: ", eventId);
            should(params[0]).be.exactly("late test");   
            done();
        }
        scheduler.addEventListerner("event5", event);
        scheduler.saveScheduledEvent(USER, date, "event5", ["late test"]).then(function(result) {
            eventId=result;
        }, function(err) {
            console.log("err dans save Scheduled Event: ", err);
            done(err);
        });
        
    });
    
    it("save complex scheduled event in database (then execute it)", function(done) {

        var facebookAPI = require('../js/api/facebookAPI.js');
        var event = facebookAPI.getOAuthURL;
        this.timeout(10000);
     
        var date = new Date(Date.now() + 3000);
        scheduler.addEventListerner("event6", event);
        scheduler.saveScheduledEvent(USER, date, "event6", [""]).then(function(result) {
            console.log("result? ", result);
            done();
        }, function(err) {
            console.log("err dans save Scheduled Event: ", err);
            done(err);
        });
    });
    
});