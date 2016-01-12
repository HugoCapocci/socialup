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

//TODO automatically read folder 'providerAPI' , avoid exports
var providersAPI = {
    google : require('./googleAPI.js'),
    dailymotion : require('./dailymotionAPI.js'),
    facebook : require('./facebookAPI.js'),
    dropbox : require('./dropboxAPI.js'),
    twitter : require('./twitterAPI.js'),
    linkedin : require('./linkedInAPI.js'),
    vimeo : require('./vimeoAPI.js'),
    mixcloud : require('./mixcloudAPI.js'),
    soundcloud : require('./soundcloudAPI.js')
};

var userDAO = require('./userDAO.js');
var eventsDAO = require('./eventsDAO.js');
var emailService = require('./emailService.js');

var app = express();

const TWITTER = 'twitter';

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
        eventsDAO.updateScheduledEventAfterError(eventId, err);
        /*console.log("Cannot send message err: "+err);*/
    });
});
//publishFileToProviders(providers, file)
scheduler.addEventListerner("uploadVideo", function(eventId, userId, providers, providersOptions, file, title, description, tags) {
   
    var params = {
        title:title,
        description:description,
        tags:tags,
        file : file
    };
    publishFileToProviders(userId, providers, providersOptions, file, params).then(function(results) {
        
        if(results && results.length>0 && results[0].url)
            params.url=results[0].url;
        console.log("publishFileToProviders results: ",results);        
        eventsDAO.updateScheduledEventAfterExecution(eventId, results);
        // check chained Event
        return eventsDAO.retrieveChainedEvents(eventId);
    
    }, function(err) {
        eventsDAO.updateScheduledEventAfterError(eventId, err);
 
    }).then(function(chainedEvents) {                        
        //executeChainedEvents
        return executeChainedEvents(chainedEvents, params);
    }).fin(function () {
        //eventsDAO.updateScheduledEventAfterExecution(eventId, results);
        fs.unlink(file.path);
    });
});

function executeChainedEvents(chainedEvents, args) {
    
    var results = [];
    chainedEvents.forEach(function(chainedEvent) {
        console.log("execute chainedEvent: ",chainedEvent);
        console.log("with results: ",results);
        var params;
        if(chainedEvent.eventType==='message')
            params = {
                url : args.url,
                title: args.title,
                description : args.description
            }; 
        else if(chainedEvent.eventType==='uploadCloud') {
            params = {
                file:args.file
            };
        }
        results.push(executeChainedEvent(chainedEvent, params));
    });
    return Q.all(results);
}

function executeChainedEvent(event, params) {

    console.log("executeChainedEvent: ",event);           
    if(event.eventType==='message') {  
        return postMediaLinkToProviders(event.user, event.providers, event.eventParams[0], params.url, params.title, params.description, event.providersOptions);
    } else if(event.eventType==='uploadCloud') {
        console.log("upload drive with params: ", params);
        var provider = event.providers[0];
        return getRefreshedToken(provider, event.user).then(function(tokens) {
            return providersAPI[provider].uploadDrive(tokens, params.file, event.eventParams[0]);
        }).then(function(results) {
            console.log("eventsDAO.updateChainedEventAfterExecution");
            eventsDAO.updateChainedEventAfterExecution(event._id, results);
        }, function(err) {
            eventsDAO.updateChainedEventAfterError(event._id, err);
        });
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

//return promise
function getRefreshedToken(provider, userId) {
    
    //console.log("getRefreshedToken for userId: ", userId);
    
    var myToken = users[userId].providers[provider].tokens;
    if(provider !== 'soundcloud' && myToken.expiry_date && myToken.expiry_date <= Date.now() ) {
        console.log("refresh oauth token for provider "+provider);
        if(providersAPI[provider].refreshTokens instanceof Function) {
            if(provider ==='google')
                myToken = users[userId].providers[provider].originalTokens;
            return providersAPI[provider].refreshTokens(myToken, userId);
        } else
            return Q.fcall(function () {
                throw new Error('no "refreshTokens" function for provider '+provider);
            });
    } else
        return Q.fcall(function () {
            return myToken;
        });
}

// oauth callback for each kind of provider
app.get('/*2callback', function(req, res) {
    
    var provider = req.path.split("2callback")[0].substr(1);
    //console.log("provider found :", provider);
    var code = req.query.code;
    var userId = req.query.state;
    //console.log('call back with userId ',userId);
    
    if(users[userId]===undefined)
        initiateUser(userId);

    var getTokens;
    if(provider === TWITTER) {
        
        if(!users[userId].providers[TWITTER]) {
            res.status(400).end("Error in twitter oauth process");
            return;
        }
        var oauth_token = req.query.oauth_token;
        var oauth_verifier = req.query.oauth_verifier;  
        var tokens = users[userId].providers[TWITTER].tokens;
        tokens.oauth_token=oauth_token;
        getTokens = function() {
            return providersAPI.twitter.getAccessToken(oauth_verifier, tokens);
        };
    } else
        getTokens = function() { 
            return providersAPI[provider].pushCode(code, userId); 
        };

    getTokens().then(function(tokens) {
                  
        if(tokens.expires_in) {
            tokens.expiry_date = Date.now() + (provider === 'linkedin' ? tokens.expires_in*1000 : tokens.expires_in);   
            delete tokens.expires_in;
        }
        users[userId].providers[provider] = { 
            tokens : tokens
        };
        //save google original token with refresh-token apart
        if(provider === 'google' && tokens.refresh_token) {
            users[userId].providers[provider].originalTokens=tokens;
        }
        // console.log('stored token for provider: ', tokens);
        return providersAPI[provider].getUserInfo(tokens);
        
    }).then(function(userInfo) {
        users[userId].providers[provider].userName = userInfo.userName;
        return userDAO.saveUser(users[userId]);
  
    }).then(function(userSaved) {
        users[userId] = userSaved;
        res.redirect('/#?close=true');
    
    }).fail(function(err) {
        console.error("error : ", err);
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
app.get('/tracedEvents/:userId', function(req, res) {
    var userId = req.params.userId; 
    eventsDAO.retrieveTracedEventsByUser(userId).then(function(events) {
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
app.delete('/event/traced/:eventId', function(req, res) {
    var eventId = req.params.eventId;
    eventsDAO.deleteTracedEvent(eventId).then(function(result) {
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
    getRefreshedToken(provider, userId).then(function(tokens) {
        users[userId].tokens[provider]=tokens;
        userDAO.updateUserTokens(userId, provider, tokens);
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
    
    var typeFilter = req.query.typeFilter;
    //console.log("Cloud provider: ", provider);
    
    getRefreshedToken(provider, userId).then(function(tokens) {
        return providersAPI[provider].listFiles(tokens, folderId, typeFilter);
    }, function(err) {
         res.send(err);
    }).then(function(files) {
         res.send(files);
    }, function(err) {
         res.send("Google OAuth OK but GoogleDrive err: "+err);
    });
});

app.get('/file/:provider/:fileId/:userId', function(req, res) {
    
    // console.log("get file ?");
    var fileId = req.params.fileId;
    var provider = req.params.provider;
    var userId = req.params.userId;
   
    getRefreshedToken(provider, userId).then(function(tokens) {
        //pipe the bytes returned from request to the response 'res', in order to directly download the file
        providersAPI[provider].downloadFile(tokens, fileId).pipe(res);
    }, function(err) {
         res.send(err);
    });
});

app.delete('/file/:provider/:fileId/:userId', function(req, res) {
    
    // console.log("get file ?");
    var fileId = req.params.fileId;
    var provider = req.params.provider;
    var userId = req.params.userId;
    
    console.log("delete cloud file, fileid = ",fileId);
   
    getRefreshedToken(provider, userId).then(function(tokens) {
        //pipe the bytes returned from request to the response 'res', in order to directly download the file
        return providersAPI[provider].deleteFile(tokens, fileId);
    }).then(function() {
        res.status(204).end();
    }).fail(function(err) {
        res.send(err);
    });
});

app.get('/spaceUsage/:provider/:userId', function(req, res) {
    
    var provider = req.params.provider;
    var userId = req.params.userId;
    
    getRefreshedToken(provider, userId).then(function(tokens) {
        //pipe the bytes returned from request to the response 'res', in order to directly download the file
       return providersAPI[provider].getSpaceUsage(tokens);
    }).then(function(spaceUsage) {
         res.send(spaceUsage);
    }).fail(function(err) {
         res.send(err);
    });
    
});

app.get('/searchPage/:provider/:pageName/:userId', function(req, res) {
    
    var provider = req.params.provider;
    var userId = req.params.userId;
    var pageName = req.params.pageName;
    
    getRefreshedToken(provider, userId).then(function(tokens) {
        //pipe the bytes returned from request to the response 'res', in order to directly download the file
       return providersAPI[provider].searchPage(tokens, pageName);
    }).then(function(pagesFound) {
         res.send(pagesFound);
    }).fail(function(err) {
         res.send(err);
    });
    
});

app.get('/pageMetrics/:provider/:metricType/:pageId/:userId', function(req, res) {
    
    var provider = req.params.provider;
    var metricType = req.params.metricType;
    var userId = req.params.userId;
    var pageId = req.params.pageId;
    var since = req.query.since;
    var until = req.query.until;
    
    getRefreshedToken(provider, userId).then(function(tokens) {
       return providersAPI[provider].getPageMetrics(tokens, metricType, pageId, since, until);
    }).then(function(pagesFound) {
         res.send(pagesFound);
    }).fail(function(err) {
         res.send(err);
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
    var providersOptions = req.body.providersOptions;
    //TODO use providersOptions for messages
   // console.log("providersOptions? ",providersOptions);

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
            //async
            eventsDAO.createTracedEvent(userId, "message", [message], providers, providers, results);
            res.send(results);
        }, function(err) {
            eventsDAO.createTracedEventError(userId, "message", [message], providers, providers, err);
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
        results.push(postMessageToProvider(userId, provider, providersOptions ? providersOptions[provider] : undefined, message));
    }
    return Q.all(results);
}
function postMessageToProvider(userId, provider, providerOptions, message) {
    
    var deffered = Q.defer();
    if(providersAPI[provider]===undefined || providersAPI[provider].postMessage ===undefined)
    deffered.reject(new Error("unknow provider "+provider+" or unsupported function postMessage"));
    
    getRefreshedToken(provider, userId).then(function(tokens) {
        //TODO add providerOptions
        return providersAPI[provider].postMessage(tokens, message, providerOptions);
    }).then(function(result) {
        result.provider=provider;
        deffered.resolve(result);
    }).fail(function(err) {
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
    if(providersAPI[provider]===undefined || providersAPI[provider].postMediaLink ===undefined)
        deffered.reject(new Error("unknow provider "+provider+" or unsupported function postMessage"));

    getRefreshedToken(provider, userId).then(function(tokens) {
        return providersAPI[provider].postMediaLink(tokens, message, url, name, description, messageProviderOptions);
    }).then(function(result) {
        deffered.resolve(result);
    }).fail(function(err) {
        deffered.reject(err);
    });
    return deffered.promise;
}

app.post('/publishFromCloud/:userId', function(req, res) {
    
    var userId = req.params.userId;
        
    // var scheduledDate = req.body.scheduledDate;
    var providers = req.body.providers;        
    var providersOptions = req.body.providersOptions;
    var cloudProvider = req.body.cloudProvider;
    //id or path of the file to download from cloud 
    var fileId = req.body.fileId;
    var fileName = req.body.fileName;
    var writeStream;
    
    getRefreshedToken(cloudProvider, userId).then(function(tokens) {

        writeStream=fs.createWriteStream('./server/uploads/'+userId+fileName); 
        providersAPI[cloudProvider].downloadFile(tokens, fileId).pipe(writeStream);
        writeStream.on('finish', function() {
            console.log('file downloaded ');
            var params = {
                title : req.body.title,
                description : req.body.description
            };
            if(req.body.tags) {
                params.tags = req.body.tags;
                console.log('publishFileToProviders params: ', params);
            }
            console.log('providers: ',providers); 
            publishFileToProviders(userId, providers, providersOptions, {path:'./server/uploads/'+userId+fileName}, params).then(function(results) {
                //delete temp file 
                fs.unlink('./server/uploads/'+userId+fileName);
                eventsDAO.createTracedEvent(userId, "publishFromCloud", [params.title, params.description, params.tags, cloudProvider], providers, providersOptions, results);
                res.send(results);
            }, function(err) {
                console.log(err);
                 eventsDAO.createTracedEventError(userId, "publishFromCloud", [params.title, params.description, params.tags, cloudProvider], providers, providersOptions, err);
                res.status(403).send(err);
            });
            
        });
        writeStream.on('error', function (err) {
            console.log(err);
            res.status(403).send(err);
        });
    });
});

app.post('/uploadFileToCloud/:userId', upload.single('file'), function(req, res) {
    
    var provider = req.body.provider;
    var userId = req.params.userId;
    
    getRefreshedToken(provider, userId).then(function(tokens) {
        providersAPI[provider].uploadDrive(tokens, req.file, req.body.target);
    }).then(function(result) {
        eventsDAO.createTracedEvent(userId, "uploadFileToCloud", [req.file.originalname], [provider], undefined, result);
        res.send(result);
    }).fail(function(err){
        res.status(403).send(err);
    });
    
});

app.post('/uploadMusic/:userId', upload.single('file'), function(req, res) {
    
    console.log("uploadMusic !");
    
    var path = req.file.path;
    fs.renameSync(path, path+'_'+req.file.originalname);
    req.file.path = path+'_'+req.file.originalname;
    var userId = req.params.userId;
         
    //var scheduledDate = req.body.scheduledDate;
    var providers = req.body.providers.split(',');
    var params = {
        title : req.body.title,
        description : req.body.description
    };
    if(req.body.tags)
        params.tags = req.body.tags.split(',');
    sendMusicToProviders(providers, userId, req.file, params).then(function(results) {
        fs.unlink(req.file.path);
         eventsDAO.createTracedEvent(userId, "uploadMusic", params, providers, undefined, results);
        res.send(results);
    }).fail(function(err){
        console.log(err);
        eventsDAO.createTracedEventError(userId, "uploadMusic", params, providers, undefined, err);
        res.status(403).send(err);
    });
});

function sendMusicToProviders(providers, userId, file, params) {
    var results = [];
    for(var i=0; i< providers.length; i++) {
        var provider = providers[i];
        results.push(sendMusicToProvider(provider, userId, file, params));
    }
    return Q.all(results);
}

function sendMusicToProvider(provider, userId, file, params) {
    
    var deffered = Q.defer();    
    getRefreshedToken(provider, userId).then(function(tokens) {
        console.log("sendMusic with provider: ", provider);
        return providersAPI[provider].sendMusic(tokens, file, params);
    }).then(function(result) {
        result.provider=provider;
        deffered.resolve(result);
    }, function(err) {
        deffered.reject(err);
    });
    return deffered.promise;
}

//sendvideo with file from http post TODO rename
app.post('/uploadFile/:userId', upload.single('file'), function(req, res) {
    
    //dailymotion issue : need file extension
    var path = req.file.path;
    fs.renameSync(path, path+'_'+req.file.originalname);
    req.file.path = path+'_'+req.file.originalname;
    var userId = req.params.userId;
         
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
        publishFileToProviders(userId, providers, providersOptions, req.file, params).then(function(results) {
            console.log("uploadFile OK");
            fs.unlink(req.file.path);
            //async save
            eventsDAO.createTracedEvent(userId, "uploadVideo", params, providers, providersOptions, results);
            res.send(results);
        }, function(err) {
            //TODO generate error code from error
            console.error("error in uploadFile: ", err);
            eventsDAO.createTracedEventError(userId, "uploadVideo", params, providers, providersOptions, err);
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

});

function publishFileToProviders(userId, providers, providersOptions, file, params) {
    
    var results = [];
    for(var i=0; i< providers.length; i++) {
        var provider = providers[i];
        results.push(publishFileToProvider(userId, provider, providersOptions[provider],file, params));
    }
    return Q.all(results);
}

function publishFileToProvider(userId, provider, providerOptions, file, params) {

    var deffered = Q.defer();
    
    getRefreshedToken(provider, userId).then(function(tokens) {
        return providersAPI[provider].sendVideo(tokens, file, userId, params, providerOptions);
    }).then(function(result) {
        //console.log("publishFileToProvider result: ",result);
        result.provider=provider;
        deffered.resolve(result);
    }, function(err) {
        deffered.reject(err);
    });
    return deffered.promise;
}

app.get('/facebookGroups/:userId', function(req, res) {
    
    var userId=req.params.userId;
    getRefreshedToken('facebook', userId).then(function(tokens) {
        return providersAPI.facebook.getUserGroups(tokens);
    }).then(function(groups) {
        res.send(groups);
    }).fail(function(err) {
        res.status(404).send(err);
    });
});

app.get('/facebookPages/:userId', function(req, res) {
    
    var userId=req.params.userId;
    providersAPI.facebook.getPages(users[userId].providers.facebook.tokens).then(function(pages) {
        res.send(pages);
    }, function(err) {
        res.status(404).send(err);
    });
});

//cache
var providersCategories = {};
app.get('/categories/:provider/:userId', function(req, res) {
    
    //console.log("get categories");
    
    var provider = req.params.provider;
    var userId=req.params.userId;
    
    //put categories in cache (avoid calls for almost static data)
    if(providersCategories[provider]!==undefined)
        res.send(providersCategories[provider]);
    else {
        getRefreshedToken(provider, userId).then(function(tokens) {
            return providersAPI[provider].listCategories(tokens, userId);
        }).then(function(categories) {
            providersCategories[provider]=categories;
            res.send(categories);
        }).fail(function(err) {
            res.status(403).send(err);
        });
    }
});

app.get('/search/video/:provider', function(req, res) {
    
    var provider = req.params.provider;
    var videoName = req.query.videoName;
    //opt
    var order = req.query.order;
    
    providersAPI[provider].searchVideo(videoName, order).then(function(videos) {
        res.send(videos);
    }).fail(function(err) {
        res.status(403).send(err);
    }); 
});

app.get('/media/:provider/:userId', function(req, res) {
    
    //console.log("get videos");    
    var provider = req.params.provider;
    var userId=req.params.userId;
            
    getRefreshedToken(provider, userId).then(function(tokens) {
        //userName
        return providersAPI[provider].listMedia(tokens, userId,users[userId].providers[provider].userName);
    }).then(function(media) {
        //console.log("media found: ", media);
        res.send(media);
    }).fail(function(err) {
        res.status(403).send(err);
    });
});

app.get('/authenticate', function(req, res) {
    
    var login = req.query.login;
    var password= req.query.password;
    
    if (login !== undefined && password !== undefined) {
        
        userDAO.authenticate(login, password).then(function(data) {
            res.send(data);
        }, function (err) {
            console.log(err);
            res.status(403).end();
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
            
            //TODO send mail to user
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

app.post('/user/resetPassword/:userEmail', function(req, res) {
    var userEmail=req.params.userEmail;
    
    emailService.sendMail("reset", userEmail).then(function (data) {  
        res.send(data);
    }, function (err) {
        console.log(err);
        res.status(404).end();
    });
});

var server = app.listen(app.get('port'), function() {
   console.log('Express server started on port %s', server.address().port);
});