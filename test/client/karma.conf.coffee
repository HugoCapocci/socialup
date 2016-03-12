module.exports = (config) ->

  config.set
    basePath: '../..'
    frameworks: ['jasmine', 'requirejs']
    files: [
      'test/client/main.coffee'
      {pattern: 'public/bower_components/**/*.js', included: false}
      {pattern: 'src/client/**/*.coffee', included: false},
      {pattern: 'test/client/**/*.coffee', included: false}
    ]
    exclude: [
      'src/client/app/mainTest.coffee'
    ]
    preprocessors:
      'src/client/**/*.coffee': ['coffee']
      'test/client/**/*.coffee': ['coffee']
    reporters: ['progress']
    port: 9876
    colors: true
    logLevel: config.LOG_DEBUG
    autoWatch: true
    browsers: ['PhantomJS']
    singleRun: process.env.SINGLE_RUN || true
  return