var fs = require('fs');
var scheduler = require('../js/scheduler.js');
var moment = require('moment');
var should = require('should');

describe("schedule events service", function() {
    
    it("schedule event with 1 parameter only", function(done) {
        // old date so job will be executed directly
        var date = new Date(2012, 10, 29, 10, 30, 0);
        var event = function(param) {
            console.log("event avec param: ", param);
            should(param).be.exactly("test");
            done();
        }
        scheduler.scheduleEvent(date, event, ["test"])
    });

    it("schedule event with 3 parameters", function(done) {
        // old date so job will be executed directly
        var date = new Date(2012, 10, 29, 10, 30, 0);
        var event = function(param1, param2, param3) {
            should(param1).be.exactly("test1");
            should(param2).be.exactly("test2");
            should(param3).be.exactly("test3");
            done();
        }
        scheduler.scheduleEvent(date, event, ["test1", "test2", "test3"])
    });
    
    it("schedule late event", function(done) {
        this.timeout(3000);
        // newer date        
        var date = new Date(Date.now() + 1500)
        var event = function(param) {
            console.log("late event");
            should(param).be.exactly("late test");
            done();            
        }
        scheduler.scheduleEvent(date, event, ["late test"])
    });
    
    it("schedule late event then cancel it", function() {
        // newer date
        var date = new Date(Date.now() + 3000000)
        scheduler.scheduleEvent(date, function() {}, [""]).cancel();
    });

});