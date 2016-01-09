var allTestFiles = [];
var TEST_REGEXP = /(spec|test)\.js$/i;

// Get a list of all the test files to include
for (var file in window.__karma__.files) {
  if (TEST_REGEXP.test(file)) allTestFiles.push(file);
}

/*require.config({
  // Karma serves files under /base, which is the basePath from your config file
  baseUrl: '/base',

  // dynamically load all test files
  deps: allTestFiles,

  // we have to kickoff jasmine, as it is asynchronous
  callback: window.__karma__.start
});*/

require.config({
  
   
    deps: allTestFiles,
    callback: window.__karma__.start,
    paths: {
        angular : './public/bower_components/angular/angular.min',
        angularResource : './public/bower_components/angular-resource/angular-resource.min',
        angularMocks : './public/bower_components/angular-mocks/angular-mocks',
        loginController : './public/js/controllers/login',
        authService : './public/js/services/authentication',
        alertsService : './public/js/services/alerts',
        sha1 : './public/bower_components/SHA-1/sha1'
    },
    
    baseUrl: '/base',
    
    shim: {
        angular: { exports: 'angular' },
        angularMocks : {
            deps : ['angular'],
            exports: 'angular.mock'
        },
        angularResource : {
            deps : ['angular']
        }, 
        loginController : {
            deps : ['angular']
        }
    }
});