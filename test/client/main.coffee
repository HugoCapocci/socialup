allTestFiles = []
console.log 'main.coffee'
TEST_REGEXP = /(Test)\.js$/
console.log 'regex: ', TEST_REGEXP

for file, value of window.__karma__.files
  #console.log 'file found: ', file
  #console.log 'match pattern? ', TEST_REGEXP.test(file)
  if TEST_REGEXP.test(file)
    allTestFiles.push(file)
    #console.log 'test file added: ', file

require.config
  baseUrl: '/base/src'
  deps: allTestFiles
  paths:
    angular: '../public/bower_components/angular/angular'
    angularMocks : '../public/bower_components/angular-mocks/angular-mocks'
    'angular-i18n-fr' : '../public/bower_components/angular-i18n/angular-locale_fr-fr'
    moment : '../public/bower_components/moment/moment'
  shim:
    angular: exports: 'angular'
    angularMocks:
      deps: ['angular']
      exports: 'angular.mock'
  callback: window.__karma__.start