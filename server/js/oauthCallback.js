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

var providersAPI = {
    google : require('./googleAPI.js'),
    dailymotion : require('./dailymotionAPI.js'),
    facebook : require('./facebookAPI.js'),
    dropbox : require('./dropboxAPI.js'),
    twitter : require('./twitterAPI.js'),
    linkedin : require('./linkedInAPI.js')
};

var userDAO = require('./userDAO.js');

var app = express();

const TEST_GOOGLE = 'google';
const TEST_DAILYMOTION = 'dailymotion';
const TEST_FACEBOOK = 'facebook';
const TEST_TWITTER = 'twitter';
const TEST_DROPBOX = 'dropbox';
const TEST_LINKEDIN = 'linkedin';

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
        providers : {} 
    };
}

/*
STEP 2
add events listeners
load existing scheduleEvents fromDataBase
*/
var scheduler = require('./scheduler.js');

// add post message event
scheduler.addEventListerner("message", function(eventId, userId, providers, message) {
   
    return postMessageToProviders(userId, providers, message).then(function(result) {
        scheduler.updateEventAfterExecution(eventId, result);
        /*console.log("message event OK");*/
    }, function(err) {
        scheduler.updateEventAfterError(eventId, err);
        /*console.log("Cannot send message err: "+err);*/
    });
});
//uploadToProviders(providers, file)
scheduler.addEventListerner("uploadVideo", function(eventId, userId, providers, file, title, description, tags) {
   
    var params = {
        title:title,
        description:description,
        tags:tags
    };
    uploadToProviders(userId, providers, file, params).then(function(result) {
        fs.unlinkSync(file.path);
        scheduler.updateEventAfterExecution(eventId, result);
        /*console.log("upload video event OK");*/
    }, function(err) {
        /*console.log("Cannot send message err: "+err);*/
        scheduler.updateEventAfterError(eventId, err);
    });
});

userDAO.retrieveUsers().then(function(usersFound) {
    //console.log("retieved users: ", usersFound);
    for(var i=0; i< usersFound.length;i++) {
        users[usersFound[i]._id] = usersFound[i];        
    }
    scheduler.loadScheduledEvents();
});

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
app.get('/oauthURL/:provider/:userId', function(req, res) {
    
    var provider = req.params.provider;
    var userId = req.params.userId;
    
    //twitter is more complicated and cannot give synch url
    if(provider==='twitter') {
        
        providersAPI.twitter.getTokens(userId).then(function(tokens) {
            //store token for user
            if(users[userId]===undefined)
                 initiateUser(userId);
            //save user token (step1)
            users[userId].providers[provider] = {
                userName : '',
                tokens : tokens
            };
            res.send(providersAPI.twitter.getOAuthURL()+'?oauth_token='+tokens.oauth_token);
        }, function(err) {
            console.log("error when computing twitter oauth url for user: ", err);
            res.send(err);
        });

    } else {
        if(providersAPI[provider] === undefined) 
            res.send('404');
        else
            res.send(providersAPI[provider].getOAuthURL());
    }
});

app.get('/google2callback', function(req, res) {

    var code = req.query.code;
    var userId = req.query.state;
    if(users[userId]===undefined)
        initiateUser(userId);
    
    // validate client
    providersAPI.google.pushCode(code).then(function(tokens) {

        users[userId].providers[TEST_GOOGLE] = { 
            tokens : tokens
        };
       // console.log('stored token for google: ', tokens /*users[user].tokens.google*/);      
       return providersAPI.google.getGooglePlusUser(tokens);
    
    }, function(err) {
        console.error("error in token validation: ", err);
        res.send(err);
    }).then(function(googleplusUser) {
        
        users[userId].providers[TEST_GOOGLE].userName = googleplusUser.displayName;
        return userDAO.saveUser(users[userId]);

    }, function(err) {
        console.error("error googleplusUser: ", err);
        res.send(err);

    }).then(function(userSaved) {
        users[userId] = userSaved;
        res.redirect('/#?close=true');
        
    }, function(err) {
        console.error("error in saving user: ", err);
        res.send(err);
    });
   
});

app.get('/dailymotion2callback', function(req, res) {

    var code = req.query.code;
    
    console.log('dailymotion code ');
    
    //TODO improve the way user info in retrieved/send in the 'state' parameter
    var userId = req.query.state;
    if(users[userId]===undefined)
        initiateUser(userId);
    
    //validate token
    providersAPI.dailymotion.pushCode(code, userId).then(function(tokens) {
        
        console.log("DAILYMOTION OAUTH pushed, expiry_date: ",tokens.expiry_date);
        //retrieve user infos
        providersAPI.dailymotion.getUserInfo(tokens).then(function(userInfo) {
            //console.log("dailymotion user: ", userInfo);
            users[userId].providers[TEST_DAILYMOTION] = {
                userName:userInfo.userName,
                tokens:tokens
            };
            return userDAO.saveUser(users[userId]);

        }).then(function(userSaved) {
            users[userId] = userSaved;
            res.redirect('/#?close=true');
        }, function(err) {
            res.send(err);
        });
    });
    
});

app.get('/facebook2callback', function(req, res) {

    var code = req.query.code;
    //console.log("res.statusCode", res.statusCode);

    var userId = req.query.state;
    if(users[userId]===undefined)
        initiateUser(userId);
    
    providersAPI.facebook.pushCode(code).then(function(tokens) {
        // expires_in is in milliseconds, should be around 2 hours
        tokens.expiry_date = Date.now() + tokens.expires_in;
        delete tokens.expires_in;
        users[userId].providers[TEST_FACEBOOK] = { 
            tokens:tokens
        };
        return providersAPI.facebook.getUserInfo(tokens);
    }, function(err) {
        res.send(err);
    }).then(function(userInfo) {
        
        console.log("Facebook userInfo: ",userInfo);
        users[userId].providers[TEST_FACEBOOK].userName = userInfo.userName;
        return userDAO.saveUser(users[userId]);

    }).then(function(userSaved) {
        users[userId] = userSaved;
        res.redirect('/#?close=true');
    }, function(err) {
        res.send(err);
    });

});

app.get('/dropbox2callback', function(req, res) {

    var code = req.query.code;

    var userId = req.query.state;
    if(users[userId]===undefined)
        initiateUser(userId);
    
    providersAPI.dropbox.pushCode(code).then(function(tokens) {
        users[userId].providers[TEST_DROPBOX] = { 
            tokens:tokens
        };
        return providersAPI.dropbox.getUserInfo(tokens);
        
    }).then(function(userInfo) {          
        users[userId].providers[TEST_DROPBOX].userName = userInfo.userName;
        return userDAO.saveUser(users[userId]);

    }).then(function(userSaved) {
        users[userId] = userSaved; 
        res.redirect('/#?close=true');
    }, function(err) {
        console.log("err auth dropbox: ",err);
        res.send(err);
    });
});

app.get('/twitter2callback', function(req, res) {
    
    var oauth_token = req.query.oauth_token;
    var oauth_verifier = req.query.oauth_verifier;
    var userId = req.query.state;
    
    var tokens = users[userId].providers[TEST_TWITTER].tokens;
    tokens.oauth_token=oauth_token;
    providersAPI.twitter.getAccessToken(oauth_verifier, tokens).then(function(tokens2) {
        users[userId].providers[TEST_TWITTER].tokens=tokens2;
        
        return providersAPI.twitter.getUserInfo(tokens2);
    
    }, function(err) {
        res.send(err);
    }).then(function(userInfo) {
        console.log("twitter userInfo: ",userInfo);
        users[userId].providers[TEST_TWITTER].userName = userInfo.userName;
        return userDAO.saveUser(users[userId]);

    }).then(function(userSaved) {
        users[userId] = userSaved;
        res.redirect('/#?close=true');
    }, function(err) {
        res.send(err);
    });

});

function completeOAuth(userId, provider, code, res) {
    
    providersAPI[provider].pushCode(code).then(function(tokens) {
        
        //expires_in is in seconds
        tokens.expiry_date = Date.now() + tokens.expires_in*1000;
        delete tokens.expires_in; 
        users[userId].providers[TEST_LINKEDIN].tokens=tokens;        
        console.log("linkedIn tokens: ",tokens);
        return providersAPI[provider].getUserInfo(tokens);
    
    }, function(err) {        
        res.send(provider +" AUTH ERR: "+err);
        
    }).then(function(userInfo) {
        console.log(provider +" userInfo: ",userInfo);        
        return userDAO.saveUser(users[userId]);

    }, function(err) {        
        res.send(err);
        
    }).then(function(userSaved) {
        users[userId] = userSaved;
        res.redirect('/#?close=true');
    }, function(err) {        
        res.send(err);
    });
}

app.get('/linkedin2callback', function(req, res) {
    
    console.log("linkedin2callback data ",req.query);
    var code = req.query.code;
    var userId = req.query.state;
    
    providersAPI.linkedin.pushCode(code).then(function(tokens) {
        
        //expires_in is in seconds
        tokens.expiry_date = Date.now() + tokens.expires_in*1000;
        delete tokens.expires_in; 
        users[userId].providers[TEST_LINKEDIN] = {
            tokens:tokens
        };
        console.log("linkedIn tokens: ",tokens);
        return providersAPI.linkedin.getUserInfo(tokens);
    
    }, function(err) {        
        res.send("LINKEDIN AUTH ERR: "+err);
        
    }).then(function(userInfo) {
        users[userId].providers[TEST_LINKEDIN].userName=userInfo.userName;
        //console.log("LINKEDIN userInfo: ",userInfo);        
        return userDAO.saveUser(users[userId]);

    }, function(err) {
        res.send(err);
        
    }).then(function(userSaved) {
        users[userId] = userSaved;
        res.redirect('/#?close=true');
    }, function(err) {        
        res.send(err);
    });

});

app.get('/events/:userId', function(req, res) {

    var userId = req.params.userId;    
    scheduler.retrieveEventsByUser(userId).then(function(events) {
         res.send(events);
    }, function(err) {
         res.send(err);
    });
    
});

app.get('/event/:eventId', function(req, res) {
 
    var eventId = req.params.eventId;
    scheduler.retrieveEvent(eventId).then(function(events) {
         res.send(events);
    }, function(err) {
         res.send(err);
    });
    
});


app.delete('/event/:eventId', function(req, res) {

    var eventId = req.params.eventId;    
    scheduler.deleteScheduledEvent(eventId).then(function(result) {
        var statusCode;
        if(result===1)
            statusCode=200;
        else
            statusCode=404;
        res.status(statusCode).end();
    }, function(err) {
        res.send(err);
    });

});

app.delete('/token/:provider/:userId', function(req, res) {

    var provider = req.params.provider;
    var userId = req.params.userId;
        
    userDAO.deleteToken(provider, userId).then(function(result) {
        var statusCode;
        delete users[userId].providers[provider];
        if(result===1)
            statusCode=200;
        else
            statusCode=404;
        res.status(statusCode).end();
    }, function(err) {
        res.send(err);
    });

});

app.get('/refreshToken/:provider/:userId', function(req, res) {

    var provider = req.params.provider;
    var userId = req.params.userId;

    //var myToken = users[userId].tokens[provider];
    var myToken = users[userId].providers[provider].tokens;
    providersAPI[provider].refreshTokens(myToken, userId).then(function(tokens) {
        users[userId].tokens[provider]=tokens;
        res.status(200).end();
    }, function(err) {
        res.send(err);
    });

});

app.get('/user/:userId', function(req, res) {

    var userId = req.params.userId;
    userDAO.retrieveUserById(userId).then(function(user) {
        res.send(user);
    }, function(err) {
        res.send(err);
    });

});

app.get('/cloudExplorer/:provider/:folderId/:userId', function(req, res) {

    var folderId = req.params.folderId;
    var provider = req.params.provider;
    var userId = req.params.userId;
    var myToken = users[userId].providers[provider].tokens;
    console.log("Cloud provider: ", provider);
    providersAPI[provider].listFiles(myToken, folderId).then(function(files) {
         res.send(files);
    }, function(err) {
         res.send("Google OAuth OK but GoogleDrive err: "+err);
    });

});

app.post('/message/:userId', function(req, res) {

    var providers = req.body.providers;
    var message = req.body.message;
    var scheduledDate = req.body.scheduledDate;
    var userId = req.params.userId;
    
    if(scheduledDate===undefined || (new Date(scheduledDate)).getTime()<=Date.now())
        postMessageToProviders(userId, providers, message).then(function(results) {
            res.send(results);
        }, function(err) {
            res.send("Cannot send message err: "+err);
        });
    else {
        //scheduled event
        console.log("schedule event for ",scheduledDate);
        scheduler.saveScheduledEvent(userId, scheduledDate, "message", [providers, message]).then(function(eventId) {
            res.send(eventId);
        }, function(err) {
            res.send("Cannot create or save scheduled event: "+err);
        });
    }
});

function postMessageToProviders(userId, providers, message) {
    var results = [];
    for(var i=0; i< providers.length; i++) {
        var provider = providers[i];
        results.push(postMessageToProvider(userId, provider, message));
    }
    return Q.all(results);
}

function postMessageToProvider(userId, provider, message) {
    
    var deffered = Q.defer();    
    var myToken = users[userId].providers[provider].tokens;
   
    if(providersAPI[provider]===undefined || providersAPI[provider].postMessage ===undefined)
        deffered.reject(new Error("unknow provider "+provider+" or unsupported function postMessage"));
    
    providersAPI[provider].postMessage(myToken, message).then(function(result) {
        deffered.resolve(result);
    }, function(err) {
        deffered.reject(err);
    });
    return deffered.promise;
}

//sendvideo
app.post('/uploadFile/:userId', upload.single('file'), function(req, res) {
    
    //dailymotion issue : need file extension
    var path = req.file.path;
    fs.renameSync(path, path+'_'+req.file.originalname);
    req.file.path = path+'_'+req.file.originalname;
    var userId = req.params.userId;
    
    if(req.body.isCloud) {
        
        var myToken = users[userId].providers[TEST_DROPBOX].tokens;
        //upload File to root folder
        providersAPI.dropbox.uploadDrive(myToken, req.file).then(function(results) {
            console.log("uploadDrive OK on dropbox");
            fs.unlinkSync(req.file.path);
            res.send(results);
        }, function(err) {
            console.error("error in uploadDrive: ", err);
            res.send("uploadDrive ERROR "+err);
        });

    } else {
        
        var scheduledDate = req.body.scheduledDate;
        var providers = req.body.providers.split(',');
        
        console.log('scheduledDate? ', scheduledDate);
        var params = {
            title : req.body.title,
            description : req.body.description,
            tags : req.body.tags.split(',')
        };

        if(scheduledDate===undefined || (new Date(scheduledDate)).getTime()<=Date.now()) {
        
            // provider for fileupload            
            console.log('targeted providers: ', providers);
            uploadToProviders(userId, providers, req.file, params).then(function(results) {
                console.log("uploadFile OK");
                fs.unlinkSync(req.file.path);
                res.send(results);
            }, function(err) {
                console.error("error in uploadFile: ", err);
                res.send("uploadFile ERROR "+err);
            });
            //scheduled event
        } else {
            scheduler.saveScheduledEvent(userId, scheduledDate, "uploadVideo", 
                [providers, req.file, params.title, params.description, params.tags]
            ).then(function(eventId) {
                res.send(eventId);
            }, function(err) {
                console.log("err dans save Scheduled Event: ", err);
                res.send("Cannot create or save scheduled event: "+err);
            });
        }
    }
});

function uploadToProviders(userId, providers, file, params) {
    
    var results = [];
    for(var i=0; i< providers.length; i++) {
        var provider = providers[i];
        results.push(uploadToProvider(userId, provider, file, params));
    }
    return Q.all(results);
}

function uploadToProvider(userId, provider, file, params) {

    var deffered = Q.defer();    
    var myToken = users[userId].providers[provider].tokens;
    providersAPI[provider].sendVideo(myToken, file, userId, params).then(function(result) {
        //console.log("uploadToProvider result: ",result);
        deffered.resolve({provider:provider, url:result});
    }, function(err) {
        deffered.reject(err);
    });
    return deffered.promise;
}

app.get('/authenticate', function(req, res) {
    
    var login = req.query.login;
    var password= req.query.password;
    
    if (login !== undefined && password !== undefined) {
        
        userDAO.authenticate(login, password).then(function(data) {
            res.send(data);
        }, function (err) {
            console.log(err);
            res.status(404).end();
        });

    } else {
        console.log("social auth not yet implemented");
        res.status(404).end();
    }

});

app.post('/user/create', function(req, res) {
    
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var login = req.body.login;
    var password = req.body.password;

    if (login !== undefined && password !== undefined && firstName !== undefined && lastName !== undefined) {
        
        var user = {
            firstName:firstName,
            lastName:lastName,
            login:login,
            password:password,
            providers : {}
        };
        userDAO.saveUser(user).then(function (data) {
            res.send(data);
        }, function (err) {
            console.log(err);
            res.status(404).end();
        });
        
    } else {
        console.log("social user registration not yet implemented");
        res.status(404).end();
    }

});

var server = app.listen(app.get('port'), function() {
   console.log('Express server started on port %s', server.address().port);
});