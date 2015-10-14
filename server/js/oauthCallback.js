'use strict';

var express = require('express');
var googleAPI = require('./googleAPI.js');
var app = express();

/*app.configure('development', function() {
  app.use(express.errorHandler());
});*/
/*app.configure(function() {*/
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/public');
  //app.set('view engine', 'jade');
  /*app.use(express.favicon());*/
  /*app.use(express.logger('dev'));*/
  var bodyParser = require('body-parser');
  app.use(bodyParser.urlencoded());
  var cookieParser = require('cookie-parser');
  app.use(cookieParser());
/*});*/

app.get('/google2callback', function(req, res) {
    console.log(req.query);
    var code = req.query.code;
    console.log(code);    
    googleAPI.pushCode(code);
    res.send("OK");
    //validate client
});

var server = app.listen(3000);

//generate client 
console.log("valider URL: ", googleAPI.auth() );

console.log('Express server started on port %s', server.address().port);