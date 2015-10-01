var fs = require('fs');
var dummy = require('../js/dummy.js');
var should = require('should');

describe("dummy need #1", function() {
    it("empty function should exist", function() {
        should.exist(dummy.emptyFunction);
    });
    it("empty function should always return empty result", function() {
        should(dummy.emptyFunction()).be.exactly("");
    });
});