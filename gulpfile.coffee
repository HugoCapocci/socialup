coffee = require 'gulp-coffee'
coffeelint = require 'gulp-coffeelint'
gulp = require 'gulp'
istanbul = require 'gulp-coffee-istanbul'
jade = require 'gulp-jade'
less  = require 'gulp-less'
concatCss = require 'gulp-concat-css'
mocha = require 'gulp-mocha'
uglify = require 'gulp-uglify'
gulpFilter = require 'gulp-filter'
guppy = require('git-guppy')(gulp)
plumber = require 'gulp-plumber'

gulp.task 'watch', ['default'], ->

  gulp.watch './src/client/**/*.coffee', ['compileAngularCoffee']
  gulp.watch './src/client/**/*.jade', ['compileJade']
  gulp.watch 'src/client/**/*.less', ['compileCss']

  return

gulp.task 'coverage', ->
  gulp.src [
    'src/server/**/*.coffee'
    '!src/server/coffee/providersAPI.coffee'
    '!src/server/coffee/oauthCallback.coffee'
  ]
  .pipe istanbul includeUntested: false
  .pipe istanbul.hookRequire()
  .on 'finish', ->
    gulp.src [
      'test/server/**/*.coffee'
    ]
    .pipe mocha()
    .pipe istanbul.writeReports
      reporters: [ 'lcov', 'json' ]
      dir: 'coverage/server-report'
    .once 'error', -> process.exit 1

gulp.task 'coffeelintNode', ->
  opt =
    max_line_length:
      value: 120
      level: 'error'
    cyclomatic_complexity:
      level: 'error'
    space_operators:
      level: 'error'
    no_unnecessary_double_quotes:
      level: 'error'
    eol_last:
      level: 'error'
    no_debugger:
      level: 'error'
  gulp.src ['src/server/**/*.coffee']
  .pipe coffeelint opt
  .pipe coffeelint.reporter()
  .pipe coffeelint.reporter 'fail'
  .on 'error', (code) -> process.exit 1

gulp.task 'pre-commit', ['coffeelintNode', 'coverage']

gulp.task 'minifyServer', ['compileCoffee'], ->
  gulp.src ['./temp/server/**/*.js']
  .pipe plumber()
  .pipe uglify()
  .pipe gulp.dest './server'

gulp.task 'minifyClient', ['compileAngularCoffee'], ->
  #TODO remove temp files
  gulp.src ['./temp/client/**/*.js']
  .pipe plumber()
  .pipe uglify()
  .pipe gulp.dest './public'

gulp.task 'compileCoffee', ->
  gulp.src ['./src/server/coffee/**/*.coffee']
  .pipe plumber()
  .pipe coffee(bare: true).on 'error', (err) ->
    console.error 'compileCoffee error: ', err
    process.exit 1
  .pipe gulp.dest './temp/server'

gulp.task 'compileAngularCoffee', ->
  gulp.src ['./src/client/**/*.coffee']
  .pipe plumber()
  .pipe coffee(bare: true).on 'error', (err) ->
    console.error 'compileAngularCoffee error: ', err
    process.exit 1
  .pipe gulp.dest './public'

gulp.task 'pre-commit-old', guppy.src 'pre-commit', (files) ->
  opt =
    max_line_length:
      value: 120
      level: 'error'
    cyclomatic_complexity:
      level: 'error'
    space_operators:
      level: 'error'
    no_unnecessary_double_quotes:
      level: 'error'
    eol_last:
      level: 'error'
    no_debugger:
      level: 'error'
  console.log 'files? ', files
  gulp.src files
  .pipe gulpFilter ['.coffee']
  .pipe coffeelint opt
  .pipe coffeelint.reporter()
  .on 'error', ->
    process.exit 1
  .on 'end', ->
    process.exit 0

gulp.task 'compileJade', ->
  gulp.src './src/client/**/*.jade'
  .pipe plumber()
  .pipe jade(locals: {})
  .pipe gulp.dest './public/'

gulp.task 'compileLess', ->
  gulp.src 'src/client/**/*.less'
  .pipe plumber()
  .pipe less()
  .pipe gulp.dest './temp/css'

gulp.task 'compileCss', ['compileLess'], ->
  gulp.src [
    'temp/css/*.css'
    'public/bower_components/angular-tree-control/css/tree-control.css'
    'public/bower_components/angular-tree-control/css/tree-control-attribute.css'
    'public/bower_components/ng-tags-input/ng-tags-input.css'
    'public/bower_components/angular-chart.js/dist/angular-chart.css'
    'public/bower_components/angular-bootstrap-calendar/dist/css/angular-bootstrap-calendar.css'
  ]
  .pipe concatCss 'bundle.css'
  .pipe gulp.dest 'public/'

gulp.task 'default', [
  'coffeelintNode'
  'minifyServer'
  'compileAngularCoffee'
  'compileJade'
  'compileCss'
]
