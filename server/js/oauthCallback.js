'use strict';

var express = require('express');
var multer  = require('multer');
var upload = multer({ dest: 'server/uploads/' });
var fs = require("fs");
require('../../localeConfig.js');
console.log("ENV ?", process.env.NODE_ENV);

var googleAPI = require('./googleAPI.js');
var dailymotionAPI = require('./dailymotionAPI.js');
var facebookAPI = require('./facebookAPI.js');

var app = express();

const DAILYMOTION_API_KEY = process.env.DAILYMOTION_API_KEY;
const DAILYMOTION_API_SECRET = process.env.DAILYMOTION_API_SECRET;
const DAILYMOTION_REDIRECT_URL = process.env.APP_URL + '/dailymotion2callback';

/*
STEP 1
load existing scheduleEvents fromDataBase (nosql, format {date, event|eventName, eventsParams[]})
*/
var scheduledEvents = {}; //byUser

var tokens = {};

/*
STEP 2
load REST API / start WEB server
*/
//store users with data and oauth tokens
var users = {};

app.set('port', process.env.PORT);

app.use(express.static('public'));

app.set('views', __dirname + '/public');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
var cookieParser = require('cookie-parser');
app.use(cookieParser());

// returns URL for oauth authentication
app.get('/oauthURL/:provider', function(req, res) {
    
    var provider = req.params.provider;
    var url;
    switch(provider) {
        case 'dailymotion' : 
            url = "https://www.dailymotion.com/oauth/authorize?response_type=code&client_id="+DAILYMOTION_API_KEY+"&redirect_uri="+DAILYMOTION_REDIRECT_URL+"&scope=userinfo+email+manage_videos+manage_playlists";
            break;
        case 'google' :
        case 'youtube' :
            url = googleAPI.auth();
            break;
        case 'facebook' :
            url = facebookAPI.getOAuthURL();
            break;
        default:
            res.send("404");
    }
    
    res.send(url);
    console.log("oauth url for provider["+provider+"] -> ", url);
});

app.get('/google2callback', function(req, res) {

    var code = req.query.code;
    console.log(code);

    //TODO improve the way user info in retrieved/send in the 'state' parameter
    var user = req.query.state;
    if(users[user]===undefined)
        users[user] = {
            tokens : {} 
        };
    
    // validate client
    googleAPI.pushCode(code).then(function(tokens) {

        users[user].tokens['youtube']=tokens;
        console.log('stored token for youtube: ', users[user].tokens.youtube);
        
      /*  googleAPI.uploadFile(tokens).then(function() {
            console.log("file uploaded");*/
             res.send("OK");
       /* }, function(err) {
            console.error("error in file upload: ", err);
            res.send("ERROR "+err);
        });*/
    }, function(err) {
        console.error("error in token validation: ", err);
        res.send("ERROR "+err);
    });
   
});

app.get('/dailymotion2callback', function(req, res) {

    var code = req.query.code;
    
    console.log('dailymotion code ')
    
    //TODO improve the way user info in retrieved/send in the 'state' parameter
    var user = req.query.state;
    if(users[user]===undefined)
        users[user] = {
            tokens : {} 
        };
    
    //validate token
    dailymotionAPI.pushCode(code).then(function(token) {
        //retrieve user infos
        dailymotionAPI.getUserInfo().then(function(userInfo) {
            
            console.log("user id: " + userInfo.id);            
            users[user].tokens['dailymotion']=token;
            console.log('stored token for dailymotion: ', users[user].tokens.dailymotion);
            res.send("OK M."+userInfo.screenname);
        }, function(err) {
            res.send("ERROR "+err);
        });
        //console.log("token retrieved ", tokens);
/*        dailymotionAPI.sendVideo().then(function() {
            res.send("OK");
        }, function(err) {
            res.send("ERROR "+err);
        });     */   
    });
    
});

console.log('FB URL', facebookAPI.getOAuthURL());

app.get('/facebook2callback', function(req, res) {

    var code = req.query.code;
    //console.log("FB code: ", req);
    console.log("res.statusCode", res.statusCode);

    var user = req.query.state;
    if(users[user]===undefined)
        users[user] = {
            tokens : {} 
        };
    
    facebookAPI.pushCode(code).then(function(tokens) {

       users[user].tokens['facebook']=tokens;
       console.log('stored token for facebook: ', users[user].tokens.facebook);
       return facebookAPI.sendVideo();        
    }, function(err) {
        res.send("ERR AUTH");
    }).then(function() {
        res.send("VIDEO SEND !");
    }, function(err) {
        res.send("ERROR SENDING VIDEO"+err);
    });

});

app.post('/uploadFile', upload.single('file'), function(req, res) {
    console.log("file upload - TODO");
    console.log(req.file);
    console.log('Title: ', req.body.title);
    
    //send file to youtube:   
    var myToken = users['user'].tokens['youtube'];
    console.log("myToken: ", myToken);
    googleAPI.uploadFile(myToken, req.file).then(function() {
        console.log("uploadFile OK");
        //supprimer fichier tempo
        fs.unlinkSync(req.file.path);
        res.send("uploadFile OK");
    }, function(err) {
        console.error("error in uploadFile: ", err);
        res.send("uploadFile ERROR "+err);
    }); 
})

var server = app.listen(app.get('port'), function() {
   console.log('Express server started on port %s', server.address().port);
});