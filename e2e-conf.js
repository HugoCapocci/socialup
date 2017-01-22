require('coffee-script/register');
let SpecReporter = require('jasmine-spec-reporter').SpecReporter;

exports.config = {
  allScriptsTimeout: 11000,
  framework: 'jasmine',
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['test/e2e/spec.coffee'],
  jasmineNodeOpts: {
    showColors: true,
    stopSpecOnExpectationFailure: false,
    print: function() {}
  },
  onPrepare: function () {
    jasmine.getEnv().addReporter(new SpecReporter({
      spec: {
        displayStacktrace: true
      }
    }));
  }
}
