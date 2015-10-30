'use strict';

var express = require('express');
var googleAPI = require('./googleAPI.js');
var dailymotionAPI = require('./dailymotionAPI.js');
var facebookAPI = require('./facebookAPI.js');
var app = express();

const DAILYMOTION_API_KEY ='899e322efb0511cecc7b';
const DAILYMOTION_API_SECRET ='fb3ee342efb21270242f20c70e31a16ce1feee0c';
const DAILYMOTION_REDIRECT_URL = 'http://localhost:3000/dailymotion2callback';

/*
STEP 1
load existing scheduleEvents fromDataBase (nosql, format {date, event|eventName, eventsParams[]})
*/
var scheduledEvents = {}; //byUser


/*
STEP 2
load REST API / start WEB server
*/

app.set('port', process.env.PORT || 5000);

app.use(express.static('public'));

app.set('views', __dirname + '/public');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
var cookieParser = require('cookie-parser');
app.use(cookieParser());

app.get('/google2callback', function(req, res) {

    var code = req.query.code;
    console.log(code);
    // validate client
    googleAPI.pushCode(code).then(function(tokens) {        
        googleAPI.uploadFile(tokens).then(function() {
            console.log("file uploaded");
        }, function(err) {
            console.error("error in file upload: ", err);
        });
    });
    res.send("OK");

});

var dailymotionURL = "https://www.dailymotion.com/oauth/authorize?response_type=code&client_id="+DAILYMOTION_API_KEY+"&redirect_uri="+DAILYMOTION_REDIRECT_URL+"&scope=userinfo+manage_videos+manage_playlists";

console.log("dailymotionURL: ", dailymotionURL);

app.get('/dailymotion2callback', function(req, res) {

    var code = req.query.code;
    dailymotionAPI.pushCode(code).then(function() {
 
        //console.log("token retrieved ", tokens);
        dailymotionAPI.sendVideo().then(function() {
            res.send("OK");
        }, function(err) {
            res.send("ERROR "+err);
        });        
    });
    
});

app.get('/facebook2callback', function(req, res) {

    var code = req.query.code;
    //console.log("FB code: ", req);
    console.log("res.statusCode", res.statusCode);
    facebookAPI.pushCode(code).then(function(tokens) {         
       return facebookAPI.sendVideo();        
    }, function(err) {
        res.send("ERR AUTH");
    }).then(function() {
        res.send("VIDEO SEND !");
    }, function(err) {
        res.send("ERROR SENDING VIDEO"+err);
    });
        
    
});

var server = app.listen(app.get('port'), function() {
   console.log('Express server started on port %s', server.address().port);
});

//generate client 
console.log("valider URL: ", googleAPI.auth() );