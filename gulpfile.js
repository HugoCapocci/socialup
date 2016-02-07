// include gulp
var gulp = require('gulp'); 
// include plug-ins
var jshint = require('gulp-jshint');
var coffeelint = require('gulp-coffeelint');
var packageJSON  = require('./package');
var jshintConfig = packageJSON.jshintConfig;
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var htmlreplace = require('gulp-html-replace');
var uglify = require('gulp-uglify');
var coffee = require("gulp-coffee");
var rename = require("gulp-rename");
var dist = "build/";
//register automatically coffee files
require('coffee-script/register');
console.log("version ",packageJSON.version);

gulp.task('pre-test', function () {
  return gulp.src(['server/**/*.js'])
    // Covering files 
    .pipe(istanbul())
    // Force `require` to return covered files 
    .pipe(istanbul.hookRequire());
});

gulp.task('unitTests', function () {
  return gulp.src('server/test/**/*.coffee', {read: false})
    // gulp-mocha needs filepaths so you can't have any plugins before it {reporter: 'nyan'}
    .pipe(mocha({
      compilers: {
        coffee:'coffee-script/register'
      },
      reporter: 'spec',
      ui : 'bdd'
    }))
    .pipe(istanbul.writeReports());
});

gulp.task('frontEndTests'/*, ['unitTests']*/, function () {
  return gulp.src(['./public/test/*.js'])//,
    // gulp-mocha needs filepaths so you can't have any plugins before it {reporter: 'nyan'}
    .pipe(mocha());
});

gulp.task("compileCoffee", function() {
  return gulp.src(["./server/coffee/**/*.coffee"]) // Read the files
    .pipe(
      coffee({bare:true}) // Compile coffeescript
        .on("error",  function(err) {
            console.error(err);
        })
    )
    .pipe(gulp.dest("./temp/js"));// Write complied to disk
});

gulp.task("minifyServer", ['compileCoffee'], function() {
  return gulp.src(["./temp/**/*.js"])// Read the files
      //.pipe(stripDebug()) // remove logs
      .pipe(uglify())                     // Minify
      //.pipe(rename({extname: ".min.js"})) // Rename to ng-quick-date.min.js
      .pipe(gulp.dest("./server")); // Write minified to disk
});

//for js in HTML files, not use with angular...
gulp.task('lintHTML', function() {
    
    jshintConfig.node=false;
    jshintConfig.esnext=false;
    jshintConfig.browser=true;
    
    return gulp.src('./public/*.html')
    // if flag is not defined default value is 'auto' - auto|always|never
    .pipe(jshint.extract('always'))
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('jshintAngular', ['unitTests'], function() {
    
    jshintConfig.node=false;
    jshintConfig.esnext=false;
    jshintConfig.browser=true;
    jshintConfig.globals = {browser:true};
    
    return gulp.src(['./public/js/**/*.js', './require.js'])
    .pipe(jshint(jshintConfig))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('jshintNode', ['jshintAngular'], function() {

  var opt = {
    max_line_length : {
      value: 120
    }
  };
  return gulp.src(['server/js/**/*.coffee'])
    .pipe(coffeelint(opt))
    .pipe(coffeelint.reporter());
});

gulp.task('minify', function() {
    return gulp.src('public/js/**/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('public/dist'));
});

gulp.task('prod', ['minify'],function() {
  gulp.src('./public/index.html')
   //js/app/main.js
    .pipe(htmlreplace({
        js: {
            src: [['dist/app/main.js', './require.js']],
            tpl: '<script data-main="%s" src="%s"></script>'
        },
        version : {
            src : [[packageJSON.version]],
            tpl : '%s'
        }
    }))
    .pipe(gulp.dest(dist));

});

gulp.task('default', ['jshintNode', 'minifyServer']);