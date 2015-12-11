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
var eventsDAO = require('./eventsDAO.js');

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
scheduler.addEventListerner("message", function(eventId, userId, providers, providersOptions, message) {
   
    return postMessageToProviders(userId, providers, providersOptions, message).then(function(results) {
        eventsDAO.updateScheduledEventAfterExecution(eventId, results);
        /*console.log("message event OK");*/
    }, function(err) {
        eventsDAO.updateScheduledEventAfterExecution(eventId, err);
        /*console.log("Cannot send message err: "+err);*/
    });
});
//uploadToProviders(providers, file)
scheduler.addEventListerner("uploadVideo", function(eventId, userId, providers, providersOptions, file, title, description, tags) {
   
    var params = {
        title:title,
        description:description,
        tags:tags
    };
    uploadToProviders(userId, providers, providersOptions, file, params).then(function(results) {
       
        console.log("uploadToProviders results: ",results);
        // check chained Event
        eventsDAO.retrieveChainedEvents(eventId).then(function(chainedEvents) {
            //executeChainedEvent
            console.log(chainedEvents.length+" chainedEvents to execute");
            chainedEvents.forEach(function(chainedEvent) {
                console.log("execute chainedEvent: ",chainedEvent);
                console.log("with results: ",results);
                var params;
                if(chainedEvent.eventType==='message')
                    params = {
                        url : results[0].url,
                        title: title,
                        description : description
                    }; 
                else if(chainedEvent.eventType==='uploadCloud') {
                    params = {
                        file:file
                    };
                }
                executeChainedEvent(chainedEvent, params).then(function(chainedEventResults) {
                    console.log("chained event executed with results ",chainedEventResults);
                }, function(err) {
                    console.log("Cannot send chained message err: "+err);
                });
            });
            fs.unlinkSync(file.path);
        }); 

        eventsDAO.updateScheduledEventAfterExecution(eventId, results);
        /*console.log("upload video event OK");*/
    }, function(err) {
        /*console.log("Cannot send message err: "+err);*/
        eventsDAO.updateScheduledEventAfterExecution(eventId, err);
    });
});

function executeChainedEvent(event, params) {
    
    console.log("executeChainedEvent: ",event);
                
    if(event.eventType==='message') {  
        return postMediaLinkToProviders(event.user, event.providers, event.eventParams[0], params.url, params.title, params.description, event.providersOptions);
    } else if(event.eventType==='uploadCloud') {
        console.log("upload drive with params: ", params);
        var provider = event.providers[0];        
        var myToken = users[event.user].providers[provider].tokens;        
        return providersAPI[provider].uploadDrive(myToken, params.file, event.eventParams[0]);
    }
        
}

userDAO.retrieveUsers().then(function(usersFound) {
    console.log("retieved users: ", usersFound);
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
    eventsDAO.retrieveScheduledEventsByUser(userId).then(function(events) {
         res.send(events);
    }, function(err) {
         res.send(err);
    });    
});

app.get('/chainedEvents/:eventParentId', function(req, res) {
    var eventParentId = req.params.eventParentId;    
    eventsDAO.retrieveChainedEvents(eventParentId).then(function(events) {
         res.send(events);
    }, function(err) {
         res.send(err);
    });
});

app.get('/event/:eventId', function(req, res) {
 
    var eventId = req.params.eventId;
    eventsDAO.retrieveScheduledEvent(eventId).then(function(events) {
         res.send(events);
    }, function(err) {
         res.send(err);
    }); 
});

app.post('/event/:eventId', function(req, res) {
 
    var eventId = req.params.eventId;    
    var scheduledEvent = req.body;
    
    eventsDAO.updateScheduledEvent(eventId, scheduledEvent).then(function(result) {
         res.send(result);
    }, function(err) {
         res.send(err);
    }); 
});
//create or update chainedEvent
app.post('/event/chained/:provider/:eventId/:userId', function(req, res) {
 
    var eventId = req.params.eventId;
    var userId = req.params.userId;
    var provider= req.params.provider;
    var scheduledEvent = req.body;
    // providersOptions
    //console.log("chainedEvent: ", scheduledEvent);
    //res.send(scheduledEvent);
    eventsDAO.createChainedEvent(eventId, userId, scheduledEvent.eventType, [provider], undefined, scheduledEvent.eventParams).then(function(result) {
         res.send(result);
    }, function(err) {
         res.send(err);
    });
});

app.delete('/event/:eventId', function(req, res) {

    var eventId = req.params.eventId;    
    eventsDAO.deleteScheduledEvent(eventId).then(function(result) {
        res.status(result===1 ? 200 : 400).end();
    }, function(err) {
        res.send(err);
    });
});
app.delete('/event/chained/:eventId/:eventParentId', function(req, res) {
    var eventId = req.params.eventId; 
    var eventParentId = req.params.eventParentId;
    eventsDAO.deleteChainedEvent(eventId, eventParentId).then(function(result) {
        res.status(result===1 ? 200 : 400).end();
    }, function(err) {
        res.send(err);
    });
});

app.delete('/token/:provider/:userId', function(req, res) {

    var provider = req.params.provider;
    var userId = req.params.userId;
        
    userDAO.deleteToken(provider, userId).then(function(result) {
        delete users[userId].providers[provider];
        res.status(result===1 ? 200 : 400).end();
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
    var typeFilter = req.query.typeFilter;
    console.log("Cloud provider: ", provider);
    providersAPI[provider].listFiles(myToken, folderId, typeFilter).then(function(files) {
         res.send(files);
    }, function(err) {
         res.send("Google OAuth OK but GoogleDrive err: "+err);
    });
});

app.post('/message/:userId', function(req, res) {

    var userId = req.params.userId;
    var providers = req.body.providers;
    var message = req.body.message;
    // scheduled events
    var scheduledDate = req.body.scheduledDate;
    // chained events
    var eventParentId = req.body.eventParentId;
    // provider options (visibility for FB, ect...)
    var providersOptions = req.body.messageProvidersOptions;
    //TODO use providersOptions for messages
    console.log("providersOptions? ",providersOptions);

    if(eventParentId) {
        //Save chained event eventParentId, userId, eventType, providers, eventParams
         eventsDAO.createChainedEvent(eventParentId, userId, "message", providers, providersOptions, [message]).then(function(eventId) {
            res.send(eventId);
        }, function(err) {
            res.send("Cannot create or save chained event: "+err);
        });
        
    } else if(scheduledDate===undefined || (new Date(scheduledDate)).getTime()<=Date.now())
        
        //direct message
        postMessageToProviders(userId, providers, providersOptions, message).then(function(results) {
            res.send(results);
        }, function(err) {
            res.send("Cannot send message err: "+err);
        });
    
    else {
        //scheduled event (eventId, userId, date, eventType, providers, eventParams) 
        console.log("schedule event for ",scheduledDate);
        scheduler.saveScheduledEvent(userId, scheduledDate, "message", providers, providersOptions, [message]).then(function(eventId) {
            res.send(eventId);
        }, function(err) {
            res.send("Cannot create or save scheduled event: "+err);
        });
    }
});

//simple message
function postMessageToProviders(userId, providers, providersOptions, message) {
    var results = [];
    for(var i=0; i< providers.length; i++) {
        var provider = providers[i];
        results.push(postMessageToProvider(userId, provider, providersOptions[provider], message));
    }
    return Q.all(results);
}
function postMessageToProvider(userId, provider, providerOptions, message) {
    
    var deffered = Q.defer();    
    var myToken = users[userId].providers[provider].tokens;
   
    if(providersAPI[provider]===undefined || providersAPI[provider].postMessage ===undefined)
        deffered.reject(new Error("unknow provider "+provider+" or unsupported function postMessage"));

    //TODO add providerOptions
    providersAPI[provider].postMessage(myToken, message, providerOptions).then(function(result) {
        result.provider=provider;
        deffered.resolve(result);
    }, function(err) {
        deffered.reject(err);
    });
    return deffered.promise;
}
//message with media link
function postMediaLinkToProviders(userId, providers, message, url, name, description, messageProvidersOptions) {
    var results = [];
    console.log("postMediaLinkToProviders, messageProvidersOptions: ",messageProvidersOptions);
    for(var i=0; i< providers.length; i++) {
        var provider = providers[i];
        if(messageProvidersOptions!==undefined)
            results.push(postMediaLinkToProvider(userId, provider, message, url, name, description, messageProvidersOptions[provider]));
        else
            results.push(postMediaLinkToProvider(userId, provider, message, url, name, description));
    }
    return Q.all(results);
}
function postMediaLinkToProvider(userId, provider, message, url, name, description, messageProviderOptions) {
    
    console.log("postMediaLinkToProvider, messageProviderOptions: ",messageProviderOptions);
    
    var deffered = Q.defer();    
    var myToken = users[userId].providers[provider].tokens;
   
    if(providersAPI[provider]===undefined || providersAPI[provider].postMediaLink ===undefined)
        deffered.reject(new Error("unknow provider "+provider+" or unsupported function postMessage"));
    
    providersAPI[provider].postMediaLink(myToken, message, url, name, description, messageProviderOptions).then(function(result) {
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
        
        var providersOptions = JSON.parse(req.body.selectedProvidersOptions);
        
        console.log('scheduledDate? ', scheduledDate);
        console.log('selectedProvidersOptions? ', providersOptions);
        var params = {
            title : req.body.title,
            description : req.body.description
        };
        if(req.body.tags)
            params.tags = req.body.tags.split(',');

        if(scheduledDate===undefined || (new Date(scheduledDate)).getTime()<=Date.now()) {
        
            // provider for fileupload            
            console.log('targeted providers: ', providers);
            uploadToProviders(userId, providers, providersOptions, req.file, params).then(function(results) {
                console.log("uploadFile OK");
                fs.unlinkSync(req.file.path);
                res.send(results);
            }, function(err) {
                //TODO generate error code from error
                console.error("error in uploadFile: ", err);
                res.status(403).send(err);
            });
            //scheduled event
        } else {
            scheduler.saveScheduledEvent(userId, scheduledDate, "uploadVideo", providers, providersOptions, [req.file, params.title, params.description, params.tags]
            ).then(function(eventId) {
                res.send(eventId);
            }, function(err) {
                console.log("err dans save Scheduled Event: ", err);
                res.send("Cannot create or save scheduled event: "+err);
            });
        }
    }
});

function uploadToProviders(userId, providers, providersOptions, file, params) {
    
    var results = [];
    for(var i=0; i< providers.length; i++) {
        var provider = providers[i];
        results.push(uploadToProvider(userId, provider, providersOptions[provider],file, params));
    }
    return Q.all(results);
}

function uploadToProvider(userId, provider, providerOptions, file, params) {

    var deffered = Q.defer();
    //console.log("users[userId].providers["+provider+"]: ",users[userId].providers[provider]);
    var myToken = users[userId].providers[provider].tokens;
    providersAPI[provider].sendVideo(myToken, file, userId, params, providerOptions).then(function(result) {
        //console.log("uploadToProvider result: ",result);
        result.provider=provider;
        deffered.resolve(result);
    }, function(err) {
        deffered.reject(err);
    });
    return deffered.promise;
}

app.get('/facebookGroups/:userId', function(req, res) {
    
     var userId=req.params.userId;
    providersAPI.facebook.getUserGroups(users[userId].providers.facebook.tokens).then(function(groups) {
        res.send(groups);
    }, function(err) {
        res.status(404).send(err);
    });

});

var providersCategories = {};
app.get('/categories/:provider/:userId', function(req, res) {
    
    console.log("get categories");
    
    var provider = req.params.provider;
    var userId=req.params.userId;
    
    //TODO put categories in cache (avoid calls for almost static data)
    if(providersCategories.provider!==undefined)
        res.send(providersCategories.provider);
    else {
        var myToken = users[userId].providers[provider].tokens;
        providersAPI[provider].listCategories(myToken).then(function(categories) {
            providersCategories.provider=categories;
            res.send(categories);
        }, function(err) {
            res.status(404).send(err);
        });
    }
});

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