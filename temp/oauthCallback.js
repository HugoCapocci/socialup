var Q, TWITTER, app, bodyParser, cookieParser, emailService, error, eventsDAO, executeChainedEvent, executeChainedEvents, express, fs, getRefreshedToken, initiateUser, multer, postMediaLinkToProvider, postMediaLinkToProviders, postMessageToProvider, postMessageToProviders, providersAPI, providersCategories, publishFileToProvider, publishFileToProviders, scheduler, sendMusicToProvider, sendMusicToProviders, server, upload, userDAO, users;

express = require('express');

multer = require('multer');

upload = multer({
  dest: 'server/uploads/'
});

fs = require('fs');

Q = require('q');

try {
  require('../../localeConfig.js');
} catch (error) {
  console.warn('No configuration file found');
}

console.log('ENV ?', process.env.NODE_ENV);

providersAPI = require('./providersAPI');

userDAO = require('./userDAO.js');

eventsDAO = require('./eventsDAO.js');

emailService = require('./emailService.js');

app = express();

TWITTER = 'twitter';

users = {};

initiateUser = function(user) {
  console.log('initiate user with id: ', user);
  return users[user] = {
    id: user,
    providers: {}
  };
};

scheduler = require('./scheduler.js');

scheduler.addEventListerner('message', function(eventId, userId, providers, providersOptions, message) {
  return postMessageToProviders(userId, providers, providersOptions, message).then(function(results) {
    return eventsDAO.updateScheduledEventAfterExecution(eventId, results);
  }, function(err) {
    return eventsDAO.updateScheduledEventAfterError(eventId, err);
  });
});

scheduler.addEventListerner('uploadVideo', function(eventId, userId, providers, providersOptions, file, title, description, tags) {
  var params;
  params = {
    title: title,
    description: description,
    tags: tags,
    file: file
  };
  return publishFileToProviders(userId, providers, providersOptions, file, params).then(function(results) {
    if (results && results.length > 0 && results[0].url) {
      params.url = results[0].url;
    }
    console.log('publishFileToProviders results: ', results);
    eventsDAO.updateScheduledEventAfterExecution(eventId, results);
    return eventsDAO.retrieveChainedEvents(eventId);
  }, function(err) {
    return eventsDAO.updateScheduledEventAfterError(eventId, err);
  }).then(function(chainedEvents) {
    return executeChainedEvents(chainedEvents, params);
  }).fin(function() {
    return fs.unlink(file.path);
  });
});

getRefreshedToken = function(provider, userId) {
  var myToken;
  myToken = users[userId].providers[provider].tokens;
  if (provider !== 'soundcloud' && myToken.expiry_date && myToken.expiry_date <= Date.now()) {
    console.log("refresh oauth token for provider " + provider);
    if (providersAPI[provider].refreshTokens instanceof Function) {
      if (provider === 'google') {
        myToken = users[userId].providers[provider].originalTokens;
      }
      return providersAPI[provider].refreshTokens(myToken, userId).then(function(tokens) {
        users[userId].providers[provider].tokens = tokens;
        userDAO.updateUserTokens(userId, provider, tokens);
        return Q.fcall(function() {
          return tokens;
        });
      });
    } else {
      return Q.fcall(function() {
        throw new Error('no "refreshTokens" function for provider ' + provider);
      });
    }
  } else {
    return Q.fcall(function() {
      return myToken;
    });
  }
};

executeChainedEvents = function(chainedEvents, args) {
  var chainedEvent, j, len, params, results;
  results = [];
  for (j = 0, len = chainedEvents.length; j < len; j++) {
    chainedEvent = chainedEvents[j];
    console.log('execute chainedEvent: ', chainedEvent);
    console.log('with results: ', results);
    params = null;
    if (chainedEvent.eventType === 'message') {
      params = {
        url: args.url,
        title: args.title,
        description: args.description
      };
    } else if (chainedEvent.eventType === 'uploadCloud') {
      params = {
        file: args.file
      };
    }
    results.push(executeChainedEvent(chainedEvent, params));
  }
  return Q.all(results);
};

executeChainedEvent = function(event, params) {
  var provider;
  console.log("executeChainedEvent: ", event);
  if (event.eventType === 'message') {
    return postMediaLinkToProviders(event.user, event.providers, event.eventParams[0], params.url, params.title, params.description, event.providersOptions);
  } else if (event.eventType === 'uploadCloud') {
    console.log("upload drive with params: ", params);
    provider = event.providers[0];
    return getRefreshedToken(provider, event.user).then(function(tokens) {
      return providersAPI[provider].uploadDrive(tokens, params.file, event.eventParams[0]);
    }).then(function(results) {
      console.log("eventsDAO.updateChainedEventAfterExecution");
      return eventsDAO.updateChainedEventAfterExecution(event._id, results);
    }, function(err) {
      return eventsDAO.updateChainedEventAfterError(event._id, err);
    });
  }
};

userDAO.retrieveUsers().then(function(usersFound) {
  var i, j, len;
  console.log("retieved users: ", usersFound);
  for (j = 0, len = usersFound.length; j < len; j++) {
    i = usersFound[j];
    users[usersFound[i]._id] = usersFound[i];
  }
  return scheduler.loadScheduledEvents();
});

app.set('port', process.env.PORT);

app.use(express["static"]('public'));

app.set('views', __dirname + '/public');

bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(bodyParser.json());

cookieParser = require('cookie-parser');

app.use(cookieParser());

app.get('/oauthURL/:provider/:userId', function(req, res) {
  var provider, userId;
  provider = req.params.provider;
  userId = req.params.userId;
  if (provider === 'twitter') {
    providersAPI.twitter.getTokens(userId).then(function(tokens) {
      if (users[userId] === void 0) {
        initiateUser(userId);
      }
      users[userId].providers[provider] = {
        userName: '',
        tokens: tokens
      };
      return res.send(providersAPI.twitter.getOAuthURL() + '?oauth_token=' + tokens.oauth_token);
    });
    return function(err) {
      console.log("error when computing twitter oauth url for user: ", err);
      return res.send(err);
    };
  } else {
    if (providersAPI[provider] === void 0) {
      return res.send('404');
    } else {
      return res.send(providersAPI[provider].getOAuthURL());
    }
  }
});

app.get('/*2callback', function(req, res) {
  var code, getTokens, oauth_token, oauth_verifier, provider, tokens, userId;
  provider = req.path.split('2callback')[0].substr(1);
  code = req.query.code;
  userId = req.query.state;
  getTokens = null;
  if (users[userId] === void 0) {
    initiateUser(userId);
  }
  if (provider === TWITTER) {
    if (!users[userId].providers[TWITTER]) {
      res.status(400).end('Error in twitter oauth process');
    }
    oauth_token = req.query.oauth_token;
    oauth_verifier = req.query.oauth_verifier;
    tokens = users[userId].providers[TWITTER].tokens;
    tokens.oauth_token = oauth_token;
    getTokens = function() {
      return providersAPI.twitter.getAccessToken(oauth_verifier, tokens);
    };
    return;
  } else {
    getTokens = function() {
      return providersAPI[provider].pushCode(code, userId);
    };
    return;
  }
  getTokens().then(function(tokens) {
    if (tokens.expires_in) {
      tokens.expiry_date = Date.now() + (provider === 'linkedin' ? tokens.expires_in * 1000 : tokens.expires_in);
      delete tokens.expires_in;
    }
    users[userId].providers[provider] = {
      tokens: tokens
    };
    if (provider === 'google' && tokens.refresh_token) {
      users[userId].providers[provider].originalTokens = tokens;
    }
    return providersAPI[provider].getUserInfo(tokens);
  }).then(function(userInfo) {
    users[userId].providers[provider].userName = userInfo.userName;
    return userDAO.saveUser(users[userId]);
  }).then(function(userSaved) {
    users[userId] = userSaved;
    return res.redirect('/#?close=true');
  }).fail(function(err) {});
  console.error("error : ", err);
  return res.send(err);
});

app.get('/events/:userId', function(req, res) {
  var userId;
  userId = req.params.userId;
  eventsDAO.retrieveScheduledEventsByUser(userId).then(function(events) {
    return res.send(events);
  });
  return function(err) {
    return res.send(err);
  };
});

app.get('/chainedEvents/:eventParentId', function(req, res) {
  var eventParentId;
  eventParentId = req.params.eventParentId;
  eventsDAO.retrieveChainedEvents(eventParentId).then(function(events) {
    return res.send(events);
  });
  return function(err) {
    return res.send(err);
  };
});

app.get('/tracedEvents/:userId', function(req, res) {
  var userId;
  userId = req.params.userId;
  eventsDAO.retrieveTracedEventsByUser(userId).then(function(events) {
    return res.send(events);
  });
  return function(err) {
    return res.send(err);
  };
});

app.get('/event/:eventId', function(req, res) {
  var eventId;
  eventId = req.params.eventId;
  eventsDAO.retrieveScheduledEvent(eventId).then(function(events) {
    return res.send(events);
  });
  return function(err) {
    return res.send(err);
  };
});

app.post('/event/:eventId', function(req, res) {
  var eventId, scheduledEvent;
  eventId = req.params.eventId;
  scheduledEvent = req.body;
  eventsDAO.updateScheduledEvent(eventId, scheduledEvent).then(result)(function() {
    return res.send(result);
  });
  return function(err) {
    return res.send(err);
  };
});

app.post('/event/chained/:provider/:eventId/:userId', function(req, res) {
  var eventId, provider, scheduledEvent, userId;
  eventId = req.params.eventId;
  userId = req.params.userId;
  provider = req.params.provider;
  scheduledEvent = req.body;
  eventsDAO.createChainedEvent(eventId, userId, scheduledEvent.eventType, [provider], void 0, scheduledEvent.eventParams.then(function(result) {
    return res.send(result);
  }));
  return function(err) {
    return res.send(err);
  };
});

app["delete"]('/event/:eventId', function(req, res) {
  var eventId;
  eventId = req.params.eventId;
  eventsDAO.deleteScheduledEvent(eventId).then(function(result) {
    return res.status(result === 1 ? 200 : 400).end();
  });
  return function(err) {
    return res.send(err);
  };
});

app["delete"]('/event/chained/:eventId/:eventParentId', function(req, res) {
  var eventId, eventParentId;
  eventId = req.params.eventId;
  eventParentId = req.params.eventParentId;
  eventsDAO.deleteChainedEvent(eventId, eventParentId).then(function(result) {
    return res.status(result === 1 ? 200 : 400).end();
  });
  return function(err) {
    return res.send(err);
  };
});

app["delete"]('/event/traced/:eventId', function(req, res) {
  var eventId;
  eventId = req.params.eventId;
  eventsDAO.deleteTracedEvent(eventId).then(function(result) {
    return res.status(result === 1 ? 200 : 400).end();
  });
  return function(err) {
    return res.send(err);
  };
});

app["delete"]('/token/:provider/:userId', function(req, res) {
  var provider, userId;
  provider = req.params.provider;
  userId = req.params.userId;
  userDAO.deleteToken(provider, userId).then(function(result) {
    delete users[userId].providers[provider];
    return res.status(result === 1 ? 200 : 400).end();
  });
  return function(err) {
    return res.send(err);
  };
});

app.get('/refreshToken/:provider/:userId', function(req, res) {
  var provider, userId;
  provider = req.params.provider;
  userId = req.params.userId;
  getRefreshedToken(provider, userId).then(function(tokens) {
    users[userId].tokens[provider] = tokens;
    userDAO.updateUserTokens(userId, provider, tokens);
    return res.status(200).end();
  });
  return function(err) {
    return res.send(err);
  };
});

app.get('/user/:userId', function(req, res) {
  var userId;
  userId = req.params.userId;
  userDAO.retrieveUserById(userId).then(function(user) {
    return res.send(user);
  });
  return function(err) {
    return res.send(err);
  };
});

app.get('/cloudExplorer/:provider/:folderId/:userId', function(req, res) {
  var folderId, provider, typeFilter, userId;
  folderId = req.params.folderId;
  provider = req.params.provider;
  userId = req.params.userId;
  typeFilter = req.query.typeFilter;
  return getRefreshedToken(provider, userId).then(function(tokens) {
    return providersAPI[provider].listFiles(tokens, folderId, typeFilter);
  }).then(function(files) {
    return res.send(files);
  }).fail(function(err) {
    return res.send(err);
  });
});

app.get('/file/:provider/:fileId/:userId', function(req, res) {
  var fileId, provider, userId;
  fileId = req.params.fileId;
  provider = req.params.provider;
  userId = req.params.userId;
  getRefreshedToken(provider, userId).then(function(tokens) {
    return providersAPI[provider].downloadFile(tokens, fileId).pipe(res);
  });
  return function(err) {
    return res.send(err);
  };
});

app["delete"]('/file/:provider/:fileId/:userId', function(req, res) {
  var fileId, provider, userId;
  fileId = req.params.fileId;
  provider = req.params.provider;
  userId = req.params.userId;
  return getRefreshedToken(provider, userId).then(function(tokens) {
    return providersAPI[provider].deleteFile(tokens, fileId);
  }).then(function() {
    return res.status(204).end();
  }).fail(function(err) {
    return res.send(err);
  });
});

app.get('/spaceUsage/:provider/:userId', function(req, res) {
  var provider, userId;
  provider = req.params.provider;
  userId = req.params.userId;
  return getRefreshedToken(provider, userId).then(function(tokens) {
    return providersAPI[provider].getSpaceUsage(tokens);
  }).then(function(spaceUsage) {
    return res.send(spaceUsage);
  }).fail(function(err) {
    return res.send(err);
  });
});

app.get('/searchPage/:provider/:pageName', function(req, res) {
  var pageName, provider, userId;
  provider = req.params.provider;
  pageName = req.params.pageName;
  userId = req.query.userId;
  if (!userId) {
    return providersAPI[provider].searchPage(void 0, pageName).then(function(pagesFound) {
      return res.send(pagesFound);
    }).fail(function(err) {
      return res.send(err);
    });
  } else {
    return getRefreshedToken(provider, userId).then(function(tokens) {
      return providersAPI[provider].searchPage(tokens, pageName);
    }).then(function(pagesFound) {
      return res.send(pagesFound);
    }).fail(function(err) {
      return res.send(err);
    });
  }
});

app.get('/pageMetrics/:provider/:metricType/:pageId', function(req, res) {
  var metricType, pageId, provider, sinceData, untilDate, userId;
  provider = req.params.provider;
  metricType = req.params.metricType;
  pageId = req.params.pageId;
  sinceData = req.query.since;
  untilDate = req.query.until;
  userId = req.query.userId;
  if (!userId) {
    return providersAPI[provider].getPageMetrics(void 0, metricType, pageId, sinceData, untilDate).then(function(pagesFound) {
      return res.send(pagesFound);
    }).fail(function(err) {
      return res.send(err);
    });
  } else {
    return getRefreshedToken(provider, userId).then(function(tokens) {
      return providersAPI[provider].getPageMetrics(tokens, metricType, pageId, sinceData, untilDate);
    }).then(function(pagesFound) {
      return res.send(pagesFound);
    }).fail(function(err) {
      return res.send(err);
    });
  }
});

app.post('/message/:userId', function(req, res) {
  var eventParentId, message, providers, providersOptions, scheduledDate, userId;
  userId = req.params.userId;
  providers = req.body.providers;
  message = req.body.message;
  scheduledDate = req.body.scheduledDate;
  eventParentId = req.body.eventParentId;
  providersOptions = req.body.providersOptions;
  if (eventParentId) {
    eventsDAO.createChainedEvent(eventParentId, userId, "message", providers, providersOptions, [message]).then(function(eventId) {
      return res.send(eventId);
    });
    return function(err) {
      return res.send("Cannot create or save chained event: " + err);
    };
  } else if (scheduledDate === void 0 || (new Date(scheduledDate)).getTime() <= Date.now()) {
    postMessageToProviders(userId, providers, providersOptions, message).then(function(results) {
      eventsDAO.createTracedEvent(userId, "message", [message], providers, providers, results);
      return res.send(results);
    });
    return function(err) {
      eventsDAO.createTracedEventError(userId, "message", [message], providers, providers, err);
      return res.send("Cannot send message err: " + err);
    };
  } else {
    console.log("schedule event for ", scheduledDate);
    scheduler.saveScheduledEvent(userId, scheduledDate, "message", providers, providersOptions, [message]).then(function(eventId) {
      return res.send(eventId);
    });
    return function(err) {
      return res.send("Cannot create or save scheduled event: " + err);
    };
  }
});

postMessageToProviders = function(userId, providers, providersOptions, message) {
  var j, len, provider, results;
  results = [];
  for (j = 0, len = providers.length; j < len; j++) {
    provider = providers[j];
    results.push(postMessageToProvider(userId, provider, (providersOptions ? providersOptions[provider] : void 0), message));
  }
  return Q.all(results);
};

postMessageToProvider = function(userId, provider, providerOptions, message) {
  var deffered;
  deffered = Q.defer();
  if (providersAPI[provider] === void 0 || providersAPI[provider].postMessage === void 0) {
    deffered.reject(new Error("unknow provider " + provider + " or unsupported function postMessage"));
  }
  getRefreshedToken(provider, userId).then(function(tokens) {
    return providersAPI[provider].postMessage(tokens, message, providerOptions);
  }).then(function(result) {
    result.provider = provider;
    return deffered.resolve(result);
  }).fail(function(err) {
    return deffered.reject(err);
  });
  return deffered.promise;
};

postMediaLinkToProviders = function(userId, providers, message, url, name, description, messageProvidersOptions) {
  var j, len, provider, results;
  results = [];
  console.log("postMediaLinkToProviders, messageProvidersOptions: ", messageProvidersOptions);
  for (j = 0, len = providers.length; j < len; j++) {
    provider = providers[j];
    if (messageProvidersOptions !== void 0) {
      results.push(postMediaLinkToProvider(userId, provider, message, url, name, description, messageProvidersOptions[provider]));
    } else {
      results.push(postMediaLinkToProvider(userId, provider, message, url, name, description));
    }
  }
  return Q.all(results);
};

postMediaLinkToProvider = function(userId, provider, message, url, name, description, messageProviderOptions) {
  var deffered;
  console.log("postMediaLinkToProvider, messageProviderOptions: ", messageProviderOptions);
  deffered = Q.defer();
  if (providersAPI[provider] === void 0 || providersAPI[provider].postMediaLink === void 0) {
    deffered.reject(new Error("unknow provider " + provider + " or unsupported function postMessage"));
  }
  getRefreshedToken(provider, userId).then(function(tokens) {
    return providersAPI[provider].postMediaLink(tokens, message, url, name, description, messageProviderOptions);
  }).then(function(result) {
    return deffered.resolve(result);
  }).fail(function(err) {
    return deffered.reject(err);
  });
  return deffered.promise;
};

app.post('/publishFromCloud/:userId', function(req, res) {
  var cloudProvider, fileId, fileName, providers, providersOptions, userId, writeStream;
  userId = req.params.userId;
  providers = req.body.providers;
  providersOptions = req.body.providersOptions;
  cloudProvider = req.body.cloudProvider;
  fileId = req.body.fileId;
  fileName = req.body.fileName;
  writeStream = null;
  return getRefreshedToken(cloudProvider, userId).then(function(tokens) {
    writeStream = fs.createWriteStream('./server/uploads/' + userId + fileName);
    providersAPI[cloudProvider].downloadFile(tokens, fileId).pipe(writeStream);
    writeStream.on('finish', function() {
      var params;
      console.log('file downloaded ');
      params = {
        title: req.body.title,
        description: req.body.description
      };
      if (req.body.tags) {
        params.tags = req.body.tags;
        console.log('publishFileToProviders params: ', params);
      }
      console.log('providers: ', providers);
      publishFileToProviders(userId, providers, providersOptions, {
        path: './server/uploads/' + userId + fileName
      }, params).then(function(results) {
        fs.unlink('./server/uploads/' + userId + fileName);
        eventsDAO.createTracedEvent(userId, "publishFromCloud", [params.title, params.description, params.tags, cloudProvider], providers, providersOptions, results);
        return res.send(results);
      });
      return function(err) {
        console.log(err);
        eventsDAO.createTracedEventError(userId, "publishFromCloud", [params.title, params.description, params.tags, cloudProvider], providers, providersOptions, err);
        return res.status(403).send(err);
      };
    });
    return writeStream.on('error', function(err) {
      console.log(err);
      return res.status(403).send(err);
    });
  });
});

app.post('/uploadFileToCloud/:userId', upload.single('file'), function(req, res) {
  var provider, userId;
  provider = req.body.provider;
  userId = req.params.userId;
  return getRefreshedToken(provider, userId).then(function(tokens) {
    return providersAPI[provider].uploadDrive(tokens, req.file, req.body.target);
  }).then(function(result) {
    eventsDAO.createTracedEvent(userId, "uploadFileToCloud", [req.file.originalname], [provider], void 0, result);
    return res.send(result);
  }).fail(function(err) {
    return res.status(403).send(err);
  });
});

app.post('/uploadMusic/:userId', upload.single('file'), function(req, res) {
  var params, path, providers, userId;
  path = req.file.path;
  fs.renameSync(path, path + '_' + req.file.originalname);
  req.file.path = path + '_' + req.file.originalname;
  userId = req.params.userId;
  providers = req.body.providers.split(',');
  params = {
    title: req.body.title,
    description: req.body.description
  };
  if (req.body.tags) {
    params.tags = req.body.tags.split(',');
  }
  return sendMusicToProviders(providers, userId, req.file, params).then(function(results) {
    fs.unlink(req.file.path);
    eventsDAO.createTracedEvent(userId, "uploadMusic", params, providers, void 0, results);
    return res.send(results);
  }).fail(function(err) {
    console.log(err);
    eventsDAO.createTracedEventError(userId, "uploadMusic", params, providers, void 0, err);
    return res.status(403).send(err);
  });
});

sendMusicToProviders = function(providers, userId, file, params) {
  var j, len, provider, results;
  results = [];
  for (j = 0, len = providers.length; j < len; j++) {
    provider = providers[j];
    results.push(sendMusicToProvider(provider, userId, file, params));
  }
  return Q.all(results);
};

sendMusicToProvider = function(provider, userId, file, params) {
  var deffered;
  deffered = Q.defer();
  getRefreshedToken(provider, userId).then(function(tokens) {
    console.log("sendMusic with provider: ", provider);
    return providersAPI[provider].sendMusic(tokens, file, params);
  }).then(function(result) {
    result.provider = provider;
    return deffered.resolve(result);
  }, function(err) {
    return deffered.reject(err);
  });
  return deffered.promise;
};

app.post('/uploadFile/:userId', upload.single('file'), function(req, res) {
  var params, path, providers, providersOptions, scheduledDate, userId;
  path = req.file.path;
  fs.renameSync(path, path + '_' + req.file.originalname);
  req.file.path = path + '_' + req.file.originalname;
  userId = req.params.userId;
  scheduledDate = req.body.scheduledDate;
  providers = req.body.providers.split(',');
  providersOptions = JSON.parse(req.body.selectedProvidersOptions);
  console.log('scheduledDate? ', scheduledDate);
  console.log('selectedProvidersOptions? ', providersOptions);
  params = {
    title: req.body.title,
    description: req.body.description
  };
  if (req.body.tags) {
    params.tags = req.body.tags.split(',');
  }
  if (scheduledDate === void 0 || (new Date(scheduledDate)).getTime() <= Date.now()) {
    return publishFileToProviders(userId, providers, providersOptions, req.file, params).then(function(results) {
      console.log("uploadFile OK");
      fs.unlink(req.file.path);
      eventsDAO.createTracedEvent(userId, "uploadVideo", params, providers, providersOptions, results);
      return res.send(results);
    }, function(err) {
      console.error("error in uploadFile: ", err);
      eventsDAO.createTracedEventError(userId, "uploadVideo", params, providers, providersOptions, err);
      return res.status(403).send(err);
    });
  } else {
    return scheduler.saveScheduledEvent(userId, scheduledDate, "uploadVideo", providers, providersOptions, [req.file, params.title, params.description, params.tags].then(function(eventId) {
      return res.send(eventId);
    }, function(err) {
      console.log("err dans save Scheduled Event: ", err);
      return res.send("Cannot create or save scheduled event: " + err);
    }));
  }
});

publishFileToProviders = function(userId, providers, providersOptions, file, params) {
  var j, len, provider, results;
  results = [];
  for (j = 0, len = providers.length; j < len; j++) {
    provider = providers[j];
    results.push(publishFileToProvider(userId, provider, providersOptions[provider], file, params));
  }
  return Q.all(results);
};

publishFileToProvider = function(userId, provider, providerOptions, file, params) {
  var deffered;
  deffered = Q.defer();
  getRefreshedToken(provider, userId).then(function(tokens) {
    return providersAPI[provider].sendVideo(tokens, file, userId, params, providerOptions);
  }).then(function(result) {
    result.provider = provider;
    return deffered.resolve(result);
  }, function(err) {
    return deffered.reject(err);
  });
  return deffered.promise;
};

app.get('/calendars/:provider/:userId', function(req, res) {
  var provider, userId;
  userId = req.params.userId;
  provider = req.params.provider;
  return getRefreshedToken(provider, userId).then(function(tokens) {
    return providersAPI[provider].getUserCalendars(tokens);
  }).then(function(calendars) {
    return res.send(calendars);
  }).fail(function(err) {
    return res.status(404).send(err);
  });
});

app.get('/socialEvents/:provider/:userId', function(req, res) {
  var calendarId, provider, sinceDate, untilDate, userId;
  userId = req.params.userId;
  provider = req.params.provider;
  sinceDate = req.query.since;
  untilDate = req.query.until;
  calendarId = req.query.calendarId;
  return getRefreshedToken(provider, userId).then(function(tokens) {
    return providersAPI[provider].getUserEvents(tokens, sinceDate, untilDate, calendarId);
  }).then(function(events) {
    return res.send(events);
  }).fail(function(err) {
    return res.status(404).send(err);
  });
});

app.get('/facebookGroups/:userId', function(req, res) {
  var userId;
  userId = req.params.userId;
  return getRefreshedToken('facebook', userId).then(function(tokens) {
    return providersAPI.facebook.getUserGroups(tokens);
  }).then(function(groups) {
    return res.send(groups);
  }).fail(function(err) {
    return res.status(404).send(err);
  });
});

app.get('/facebookPages/:userId', function(req, res) {
  var userId;
  userId = req.params.userId;
  return providersAPI.facebook.getPages(users[userId].providers.facebook.tokens).then(function(pages) {
    return res.send(pages);
  }, function(err) {
    return res.status(404).send(err);
  });
});

providersCategories = {};

app.get('/categories/:provider/:userId', function(req, res) {
  var provider, userId;
  provider = req.params.provider;
  userId = req.params.userId;
  if (providersCategories[provider] !== void 0) {
    return res.send(providersCategories[provider]);
  } else {
    return getRefreshedToken(provider, userId).then(function(tokens) {
      return providersAPI[provider].listCategories(tokens, userId);
    }).then(function(categories) {
      providersCategories[provider] = categories;
      return res.send(categories);
    }).fail(function(err) {
      return res.status(403).send(err);
    });
  }
});

app.get('/search/video/:provider', function(req, res) {
  var limit, next, order, provider, videoName;
  provider = req.params.provider;
  videoName = req.query.videoName;
  order = req.query.order;
  next = req.query.next;
  limit = req.query.limit;
  if (!limit || parseInt(limit) < 10 || parseInt(limit) > 50) {
    return res.status(422).send('limit field not properly set (must be >= 10 and <=50)');
  } else {
    return providersAPI[provider].searchVideo(videoName, limit, order, next).then(function(videos) {
      return res.send(videos);
    }).fail(function(err) {
      return res.status(403).send(err);
    });
  }
});

app.get('/media/:provider/:userId', function(req, res) {
  var provider, userId;
  provider = req.params.provider;
  userId = req.params.userId;
  return getRefreshedToken(provider, userId).then(function(tokens) {
    return providersAPI[provider].listMedia(tokens, userId, users[userId].providers[provider].userName);
  }).then(function(media) {
    return res.send(media);
  }).fail(function(err) {
    return res.status(403).send(err);
  });
});

app.get('/authenticate', function(req, res) {
  var login, password;
  login = req.query.login;
  password = req.query.password;
  if (login !== void 0 && password !== void 0) {
    return userDAO.authenticate(login, password).then(function(data) {
      return res.send(data);
    }, function(err) {
      console.log(err);
      return res.status(403).end();
    });
  } else {
    console.log("social auth not yet implemented");
    return res.status(404).end();
  }
});

app.post('/user/create', function(req, res) {
  var firstName, lastName, login, password, user;
  firstName = req.body.firstName;
  lastName = req.body.lastName;
  login = req.body.login;
  password = req.body.password;
  if (login !== void 0 && password !== void 0 && firstName !== void 0 && lastName !== void 0) {
    user = {
      firstName: firstName,
      lastName: lastName,
      login: login,
      password: password,
      providers: {}
    };
    return userDAO.saveUser(user).then(function(data) {
      return res.send(data);
    }, function(err) {
      console.log(err);
      return res.status(404).end();
    });
  } else {
    console.log("social user registration not yet implemented");
    return res.status(404).end();
  }
});

app.post('/user/resetPassword/:userEmail', function(req, res) {
  var userEmail;
  userEmail = req.params.userEmail;
  return emailService.sendMail("reset", userEmail).then(function(data) {
    return res.send(data);
  }, function(err) {
    console.log(err);
    return res.status(404).end();
  });
});

server = app.listen(app.get('port'), function() {
  return console.log('Express server started on port %s', server.address().port);
});
