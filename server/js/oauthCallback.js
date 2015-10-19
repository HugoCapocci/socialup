'use strict';

var express = require('express');
var googleAPI = require('./googleAPI.js');
var dailymotionAPI = require('./dailymotionAPI.js');
var app = express();

const DAILYMOTION_API_KEY ='899e322efb0511cecc7b';
const DAILYMOTION_API_SECRET ='fb3ee342efb21270242f20c70e31a16ce1feee0c';
const DAILYMOTION_REDIRECT_URL = 'http://localhost:3000/dailymotion2callback';

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
  app.use(bodyParser.urlencoded({ extended: false }));
  var cookieParser = require('cookie-parser');
  app.use(cookieParser());
/*});*/

app.get('/google2callback', function(req, res) {
    console.log(req.query);
    var code = req.query.code;
    console.log(code);
    // validate client
    googleAPI.pushCode(code);
    res.send("OK");

});

var dailymotionURL = "https://www.dailymotion.com/oauth/authorize?response_type=code&client_id="+DAILYMOTION_API_KEY+"&redirect_uri="+DAILYMOTION_REDIRECT_URL+"&scope=userinfo+manage_videos+manage_playlists";

console.log("dailymotionURL: ", dailymotionURL);

app.get('/dailymotion2callback', function(req, res) {
    
    var code = req.query.code;
    dailymotionAPI.pushCode(code).then(function() {
         dailymotionAPI.sendVideo();
    });
    res.send("OK");
});

var server = app.listen(3000);

//generate client 
console.log("valider URL: ", googleAPI.auth() );

console.log('Express server started on port %s', server.address().port);