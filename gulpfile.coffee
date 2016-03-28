coffee = require 'gulp-coffee'
coffeelint = require 'gulp-coffeelint'
gulp = require 'gulp'
istanbul = require 'gulp-coffee-istanbul'
mocha = require 'gulp-mocha'
uglify = require 'gulp-uglify'
gulpFilter = require 'gulp-filter'
guppy = require('git-guppy')(gulp)

gulp.task 'coverage', ->
  gulp.src [
    'src/server/**/*.coffee'
  ]
  .pipe istanbul includeUntested: true
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
    .once 'end', -> process.exit 0

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

gulp.task 'minifyServer', ['compileCoffee'], ->
  #TODO remove temp files
  gulp.src ["./temp/server/**/*.js"]
  .pipe uglify()
  .pipe gulp.dest "./server"

gulp.task 'minifyClient', ['compileAngularCoffee'], ->
  #TODO remove temp files
  gulp.src ["./temp/client/**/*.js"]
  .pipe uglify()
  .pipe gulp.dest './public'

gulp.task 'compileCoffee', ->
  gulp.src ["./src/server/coffee/**/*.coffee"]
  .pipe coffee(bare: true).on "error", (err) -> console.error err
  .pipe gulp.dest "./temp/server"

gulp.task "compileAngularCoffee", ->
  gulp.src ["./src/client/**/*.coffee"]
  .pipe coffee(bare: true).on "error", (err) -> console.error err
  .pipe gulp.dest "./temp/client"

gulp.task 'pre-commit.test', ['coffeelintNode']

gulp.task 'pre-commit', guppy.src 'pre-commit', (files) ->
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
  gulp.src(files)
  .pipe gulpFilter(['.coffee'])
  .pipe coffeelint opt
  .pipe coffeelint.reporter()
  .on 'error', ->
    console.log 'pre-commit error'
    process.exit 1
  .on 'end', ->
    console.log 'pre-commit end'
    process.exit 0

gulp.task 'default', [
  'coffeelintNode'
  'minifyServer'
  'minifyClient'
]
