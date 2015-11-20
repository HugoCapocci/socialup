'use strict';

var express = require('express');
var multer  = require('multer');
var upload = multer({ dest: 'server/uploads/' });
var fs = require("fs");
var Q = require('q');

try {
    require('../../localeConfig.js');
} catch (error) {
    console.warn("No configuration file found");
}
console.log("ENV ?", process.env.NODE_ENV);

var googleAPI = require('./googleAPI.js');
var dailymotionAPI = require('./dailymotionAPI.js');
var facebookAPI = require('./facebookAPI.js');
var dropboxAPI = require('./dropboxAPI.js');
var twitterAPI = require('./twitterAPI.js');
var userDAO = require('./userDAO.js');

var app = express();

const DAILYMOTION_API_KEY = process.env.DAILYMOTION_API_KEY;
const DAILYMOTION_API_SECRET = process.env.DAILYMOTION_API_SECRET;
const DAILYMOTION_REDIRECT_URL = process.env.APP_URL + '/dailymotion2callback';

const TEST_GOOGLE = 'google';
const TEST_DAILYMOTION = 'dailymotion';
const TEST_FACEBOOK = 'facebook';
const TEST_TWITTER = 'twitter';
const TEST_DROPBOX = 'dropbox';
const TEST_USER = 'user';

/*
STEP1
load users
*/
//store users with data and oauth tokens
var users = {};
function initiateUser(user) {
    console.log("initiate user with id: ", user);
    users[user] = {
        id : user,
        tokens : {} 
    };
}
userDAO.retrieveUser(TEST_USER).then(function(user) {
    console.log("retieved users: ", user);
    if(user!==null)
        users[TEST_USER]=user;
});

/*
STEP 2
add events listeners
load existing scheduleEvents fromDataBase
*/
var scheduler = require('./scheduler.js');

// add post message event
scheduler.addEventListerner("message", function(eventId, providers, message) {
   
    return postMessageToProviders(providers, message).then(function(result) {
        scheduler.updateEventAfterExecution(eventId, result);
        console.log("message event listener OK");
    }, function(err) {
        console.log("Cannot send message err: "+err);
        scheduler.updateEventAfterExecution(eventId, err);
    });
});
//uploadToProviders(providers, file)
scheduler.addEventListerner("uploadVideo", function(eventId, providers, file) {
   
    uploadToProviders(providers, file).then(function(result) {
        scheduler.updateEventAfterExecution(eventId, result);
        console.log("message event listener OK");
    }, function(err) {
        console.log("Cannot send message err: "+err);
        scheduler.updateEventAfterExecution(eventId, err);
    });
});

scheduler.loadScheduledEvents();

//clean temp files if any    
/*var path = './server/uploads/';
fs.readdir(path, function (err, files) {
    if (err) {
        console.log("cannot found folder "+path);
    } else
        files.forEach(function (file) {
            fs.unlinkSync(file);
        });
});*/

/*
STEP 3
load REST API / start WEB server
*/

app.set('port', process.env.PORT);

app.use(express.static('public'));

app.set('views', __dirname + '/public');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
var cookieParser = require('cookie-parser');
app.use(cookieParser());

// returns URL for oauth authentication
app.get('/oauthURL/:provider', function(req, res) {
    
    var provider = req.params.provider;
    var url;
    
    //twitter is more complicated and cannot give synch url
    if(provider==='twitter') {
        
        twitterAPI.getTokens().then(function(tokens) {
        
            //store token for user
            if(users[TEST_USER]===undefined)
                 initiateUser(TEST_USER);
            //save user token (step1)
            users[TEST_USER].tokens[TEST_TWITTER]=tokens;
            res.send(twitterAPI.getOAuthURL()+'?oauth_token='+tokens.oauth_token);
        }, function(err) {
            console.log("error when computing twitter oauth url for user: ", err);
            res.send(err);
        });

    } else {
        
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
        //console.log("oauth url for provider["+provider+"] -> ", url);
    }
});

app.get('/google2callback', function(req, res) {

    var code = req.query.code;

    //TODO improve the way user info in retrieved/send in the 'state' parameter
    var user = req.query.state;
    if(users[user]===undefined)
        initiateUser(user);
    
    // validate client
    googleAPI.pushCode(code).then(function(tokens) {

        users[user].tokens[TEST_GOOGLE]=tokens;
        console.log('stored token for google: ', tokens /*users[user].tokens.google*/);

       /* googleAPI.checkDrive(tokens).then(function(files) {
             res.send(files);
        }, function(err) {
             res.send("Google OAuth OK but GoogleDrive err: "+err);
        });*/
        return userDAO.saveUser(users[user]);

    }).then(function(userSaved) {
        users[user] = userSaved;
        console.log("userSaved: ", userSaved);
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
        initiateUser(user);
    
    //validate token
    dailymotionAPI.pushCode(code).then(function(token) {
        //retrieve user infos
        dailymotionAPI.getUserInfo(token).then(function(userInfo) {
            console.log("user id: " + userInfo.id);            
            users[user].tokens[TEST_DAILYMOTION]=token;
            //userInfo.screenname
            console.log('stored token for dailymotion: ', users[user].tokens.dailymotion);
            return userDAO.saveUser(users[user]);

        }).then(function(userSaved) {
            users[user] = userSaved;
            res.send("OK DAILYMOTION");
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
        initiateUser(user);
    
    facebookAPI.pushCode(code).then(function(tokens) {
       users[user].tokens[TEST_FACEBOOK]=tokens;
       console.log('stored token for facebook: ', users[user].tokens.facebook);
       return userDAO.saveUser(users[user]);

    }).then(function(userSaved) {
        users[user] = userSaved;
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
        initiateUser(user);
    
    dropboxAPI.pushCode(code).then(function(tokens) {
       users[user].tokens[TEST_DROPBOX]=tokens;
       console.log('stored token for dropbox: ', users[user].tokens.dropbox);
        
       return userDAO.saveUser(users[user]);

    }).then(function(userSaved) {
        users[user] = userSaved;       
       res.send("DROPBOX AUTH OK");
    }, function(err) {
        console.log("err auth dropbox: ",err);
        res.send("ERR AUTH");
    });
});

app.get('/twitter2callback', function(req, res) {
    
    console.log("callback data ",req.query);

    var oauth_token = req.query.oauth_token;
    var oauth_verifier = req.query.oauth_verifier;
    var user = req.query.state;
    
    var tokens =  users[user].tokens[TEST_TWITTER];
    tokens.oauth_token=oauth_token;
    twitterAPI.getAccessToken(oauth_verifier, tokens).then(function(tokens2) {
        users[user].tokens[TEST_TWITTER]=tokens2;
        return userDAO.saveUser(users[user]);

    }).then(function(userSaved) {
        users[user] = userSaved;
        res.send("TWITTER AUTH VERIFIER OK");

    }, function(err) {
        res.send("TWITTER AUTH VERIFIER OK, tweet error: ", err);
    });

});

/*app.post('/twitter/:oauthVerifier', function(req, res) { 

    var oauthVerifier = req.params.oauthVerifier;
    var user = TEST_USER;    
    
    twitterAPI.getAccessToken(oauthVerifier, users[user].tokens[TEST_TWITTER]).then(function(tokens) {
       users[TEST_USER].tokens[TEST_TWITTER]=tokens;
       res.send("TWITTER AUTH VERIFIER OK");
    }, function(err) {
        res.send("ERR TWITTER AUTH VERIFIER");
    });
    
});*/

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
    providerAPI.listFiles(myToken, folderId).then(function(files) {
         res.send(files);
    }, function(err) {
         res.send("Google OAuth OK but GoogleDrive err: "+err);
    });
    
});

app.post('/message', function(req, res) {

    //console.log("req.body: ",req.body);
    var providers = req.body.providers;
    var message = req.body.message;
    var scheduledDate = req.body.scheduledDate;
    
    if(scheduledDate===undefined)
        postMessageToProviders(providers, message).then(function() {
             res.send();
        }, function(err) {
             res.send("Cannot send message err: "+err);
        });
    else {
        //scheduled event
        console.log("schedule event for ",scheduledDate);
        scheduler.saveScheduledEvent(TEST_USER, scheduledDate, "message", [providers, message]).then(function(eventId) {
            res.send(eventId);
        }, function(err) {
            console.log("err dans save Scheduled Event: ", err);
            res.send("Cannot create or save scheduled event: "+err);
        });
    }
});

function postMessageToProviders(providers, message) {
    var results = [];
    for(var i=0; i< providers.length; i++) {
        var provider = providers[i];
        results.push(postMessageToProvider(provider, message));
    }
   // console.log("waitig for "+results.length+" promises");
    return Q.all(results);
}
function postMessageToProvider(provider, message) {
    
    console.log("postMessageToProvider "+provider); 
    var deffered = Q.defer();    
    var myToken = users[TEST_USER].tokens[provider];
    var providerAPI;
    switch(provider) {
        case 'twitter' :
            providerAPI = twitterAPI;
            break;
        case 'google' :
            providerAPI = googleAPI;
            break;
        case 'facebook' :
            providerAPI = facebookAPI;
            break;
    }
    providerAPI.postMessage(myToken, message).then(function() {
      //  console.log("uploadFile OK with provider "+provider);
        deffered.resolve('ok promise '+provider);
    }, function(err) {
        //console.error("error in uploadFile: ", err);
        deffered.reject(new Error(err));
    });
    return deffered.promise;
}

app.post('/uploadFile', upload.single('file'), function(req, res) {
    
    //dailymotion issue : need file extension
    var path = req.file.path;
    fs.renameSync(path, path+'_'+req.file.originalname);
    req.file.path = path+'_'+req.file.originalname;
    
    console.log("file upload:");
    console.log(req.file);

    if(req.body.isCloud) {
        
        var myToken = users[TEST_USER].tokens[TEST_DROPBOX];
        //upload File to root folder
        dropboxAPI.uploadDrive(myToken, req.file).then(function(results) {
            console.log("uploadDrive OK on dropbox");
            fs.unlinkSync(req.file.path);
            res.send("uploadDrive OK");
        }, function(err) {
            console.error("error in uploadDrive: ", err);
            res.send("uploadDrive ERROR "+err);
        });
        
    } else {
        
        var scheduledDate = req.body.scheduledDate;
        var providers = req.body.providers.split(',');
        
        
        console.log('scheduledDate? ', scheduledDate);
        
        if(scheduledDate===undefined) {
        
            // provider for fileupload            
            console.log('targeted providers: ', providers);

            uploadToProviders(providers, req.file).then(function(/*results*/) {
                console.log("uploadFile OK");
                fs.unlinkSync(req.file.path);
                res.send("uploadFile OK");
            }, function(err) {
                console.error("error in uploadFile: ", err);
                res.send("uploadFile ERROR "+err);
            });
            //scheduled event
        } else {
            scheduler.saveScheduledEvent(TEST_USER, scheduledDate, "uploadVideo", [providers, req.file]).then(function(eventId) {
                res.send(eventId);
            }, function(err) {
                console.log("err dans save Scheduled Event: ", err);
                res.send("Cannot create or save scheduled event: "+err);
            });
        }
    }
});

function uploadToProviders(providers, file) {
    
    var results = [];
    for(var i=0; i< providers.length; i++) {
        var provider = providers[i];
        results.push(uploadToProvider(provider, file));
    }
    // console.log("waitig for "+results.length+" promises");
    return Q.all(results);
}

function uploadToProvider(provider, file) {
    //console.log("curent provider "+provider); 
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
      //  console.log("uploadFile OK with provider "+provider);
        deffered.resolve('ok promise '+provider);
    }, function(err) {
        //console.error("error in uploadFile: ", err);
        deffered.reject(new Error(err));
    });
    return deffered.promise;
}

var server = app.listen(app.get('port'), function() {
   console.log('Express server started on port %s', server.address().port);
});