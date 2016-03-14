coffee = require 'gulp-coffee'
coffeelint = require 'gulp-coffeelint'
gulp = require 'gulp'
istanbul = require 'gulp-coffee-istanbul'
mocha = require 'gulp-mocha'
uglify = require 'gulp-uglify'

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
    .once 'error', -> process.exit()
    .once 'end', -> process.exit()

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

gulp.task 'pre-commit', ['coffeelintNode']

gulp.task 'default', [
  'coffeelintNode'
  'minifyServer'
  'minifyClient'
]
