// include gulp
var gulp = require('gulp'); 

// include plug-ins
var jshint = require('gulp-jshint');

var packageJSON  = require('./package');
var jshintConfig = packageJSON.jshintConfig;

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

gulp.task('jshintAngular', function() {
    
    jshintConfig.node=false;
    jshintConfig.esnext=false;
    jshintConfig.browser=true;
    
    return gulp.src('./public/js/**/*.js')
    .pipe(jshint(jshintConfig))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('jshintNode', ['jshintAngular'], function() {

    jshintConfig.node=true;
    jshintConfig.esnext=true;
    
    return gulp.src('./server/js/*.js')
    .pipe(jshint(jshintConfig))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));

});

gulp.task('default', ['jshintNode']);