// include gulp
var gulp = require('gulp'); 

// include plug-ins
var jshint = require('gulp-jshint');

var packageJSON  = require('./package');
var jshintConfig = packageJSON.jshintConfig;

jshintConfig.node=true;
jshintConfig.esnext=true;

// JS hint task
gulp.task('jshint', function() {
  gulp.src('./server/js/*.js')
    .pipe(jshint(jshintConfig))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});