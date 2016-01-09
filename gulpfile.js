// include gulp
var gulp = require('gulp'); 

// include plug-ins
var jshint = require('gulp-jshint');

var packageJSON  = require('./package');
var jshintConfig = packageJSON.jshintConfig;

var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');

var uglify = require('gulp-uglify');

gulp.task('pre-test', function () {
  return gulp.src(['server/**/*.js'])
    // Covering files 
    .pipe(istanbul())
    // Force `require` to return covered files 
    .pipe(istanbul.hookRequire());
});

gulp.task('unitTests', ['pre-test'], function () {
    return gulp.src('server/test/*.js', {read: false})
        // gulp-mocha needs filepaths so you can't have any plugins before it {reporter: 'nyan'}
        .pipe(mocha())
        .pipe(istanbul.writeReports());
        // Enforce a coverage of at least 90% 
      //  .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
});

gulp.task('frontEndTests'/*, ['unitTests']*/, function () {
    return gulp.src(['./public/test/*.js'])//,
        // gulp-mocha needs filepaths so you can't have any plugins before it {reporter: 'nyan'}
        .pipe(mocha());
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

    jshintConfig.node=true;
    jshintConfig.esnext=true;
    
    return gulp.src('./server/js/*.js')
    .pipe(jshint(jshintConfig))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));

});

gulp.task('minify', function() {
    return gulp.src('public/js/**/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('public/dist'));
});

gulp.task('default', ['jshintNode']);