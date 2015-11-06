'use strict';

var express = require('express');
var multer  = require('multer');
var upload = multer({ dest: 'server/uploads/' });
var fs = require("fs");
var Q = require('q');
require('../../localeConfig.js');
console.log("ENV ?", process.env.NODE_ENV);

var googleAPI = require('./googleAPI.js');
var dailymotionAPI = require('./dailymotionAPI.js');
var facebookAPI = require('./facebookAPI.js');
var dropboxAPI = require('./dropboxAPI.js');

var app = express();

const DAILYMOTION_API_KEY = process.env.DAILYMOTION_API_KEY;
const DAILYMOTION_API_SECRET = process.env.DAILYMOTION_API_SECRET;
const DAILYMOTION_REDIRECT_URL = process.env.APP_URL + '/dailymotion2callback';

const TEST_GOOGLE = 'google';
const TEST_DAILYMOTION = 'dailymotion';
const TEST_FACEBOOK = 'facebook';
const TEST_DROPBOX = 'dropbox';
const TEST_USER = 'user';

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
        case 'dropbox' :
            url = dropboxAPI.getOAuthURL();
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

        users[user].tokens[TEST_GOOGLE]=tokens;
        console.log('stored token for google: ', users[user].tokens.google);

       /* googleAPI.checkDrive(tokens).then(function(files) {
             res.send(files);
        }, function(err) {
             res.send("Google OAuth OK but GoogleDrive err: "+err);
        });*/
        res.send("google auth OK");
    }, function(err) {
        console.error("error in token validation: ", err);
        res.send("ERROR "+err);
    });
   
});

app.get('/dailymotion2callback', function(req, res) {

    var code = req.query.code;
    
    console.log('dailymotion code ');
    
    //TODO improve the way user info in retrieved/send in the 'state' parameter
    var user = req.query.state;
    if(users[user]===undefined)
        users[user] = {
            tokens : {} 
        };
    
    //validate token
    dailymotionAPI.pushCode(code).then(function(token) {
        //retrieve user infos
        dailymotionAPI.getUserInfo(token).then(function(userInfo) {
            console.log("user id: " + userInfo.id);            
            users[user].tokens[TEST_DAILYMOTION]=token;
            console.log('stored token for dailymotion: ', users[user].tokens.dailymotion);
            res.send("OK M."+userInfo.screenname);
        }, function(err) {
            res.send("ERROR "+err);
        });
    });
    
});

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
       users[user].tokens[TEST_FACEBOOK]=tokens;
       console.log('stored token for facebook: ', users[user].tokens.facebook);
       res.send("FB AUTH OK");
    }, function(err) {
        res.send("ERR AUTH");
    });

});

app.get('/dropbox2callback', function(req, res) {

    var code = req.query.code;
    console.log("drop box code: ", code);
    console.log("res.statusCode", res.statusCode);

    var user = req.query.state;
    if(users[user]===undefined)
        users[user] = {
            tokens : {} 
        };
    
    dropboxAPI.pushCode(code).then(function(tokens) {
       users[user].tokens[TEST_DROPBOX]=tokens;
       console.log('stored token for dropbox: ', users[user].tokens.dropbox);
       res.send("DROPBOX AUTH OK");
    }, function(err) {
        res.send("ERR AUTH");
    });
});

app.get('/cloudExplorer/:provider/:folderId', function(req, res) {

    var folderId = req.params.folderId;
    var provider = req.params.provider;

    var myToken = users[TEST_USER].tokens[provider];
    var providerAPI;
    switch(provider) {
        case 'google':
            providerAPI = googleAPI;
            break;
        case 'dropbox' :
            providerAPI = dropboxAPI;
            break;
    }
    
    console.log("Cloud provider: ", provider);
    providerAPI.listFolder(myToken, folderId).then(function(files) {
         res.send(files);
    }, function(err) {
         res.send("Google OAuth OK but GoogleDrive err: "+err);
    });
    
});

app.post('/uploadFile', upload.single('file'), function(req, res) {
    
    //dailymotion issue : need file extension
    var path = req.file.path;
    fs.renameSync(path, path+'_'+req.file.originalname);
    req.file.path = path+'_'+req.file.originalname;
    
    console.log("file upload:");
    console.log(req.file);

    if(req.body.isCloud) {
        
        //upload File to root folder
        googleAPI.uploadDrive(users[TEST_USER].tokens[TEST_GOOGLE], req.file).then(function(results) {
            console.log("uploadDrive OK");
            fs.unlinkSync(req.file.path);
            res.send("uploadDrive OK");
        }, function(err) {
            console.error("error in uploadDrive: ", err);
            res.send("uploadDrive ERROR "+err);
        });
        
    } else {
        // provider for fileupload
        var providers = req.body.providers.split(',');
        console.log('targeted providers: ', providers);

        uploadToProviders(providers, req.file).then(function(results) {
            console.log("uploadFile OK");
            fs.unlinkSync(req.file.path);
            res.send("uploadFile OK");
        }, function(err) {
            console.error("error in uploadFile: ", err);
            res.send("uploadFile ERROR "+err);
        });
    }
});

function uploadToProviders(providers, file) {
    
    var results = [];
    for(var i=0; i< providers.length; i++) {
        var provider = providers[i];
        results.push(uploadToProvider(provider, file));
    }
    console.log("waitig for "+results.length+" promises");
    return Q.all(results);
}

function uploadToProvider(provider, file) {
    console.log("curent provider "+provider); 
    var deffered = Q.defer();    
    var myToken = users[TEST_USER].tokens[provider];
    var providerAPI;
    switch(provider) {
        case 'dailymotion' :
            providerAPI = dailymotionAPI;
            break;
        case 'youtube' :
            providerAPI = googleAPI;
            break;
        case 'facebook' :
            providerAPI = facebookAPI;
            break;
    }
    providerAPI.sendVideo(myToken, file).then(function() {
        console.log("uploadFile OK with provider "+provider);
        deffered.resolve('ok promise '+provider);
    }, function(err) {
        console.error("error in uploadFile: ", err);
        deffered.reject(new Error(err));
    });
    return deffered.promise;
}

var server = app.listen(app.get('port'), function() {
   console.log('Express server started on port %s', server.address().port);
});