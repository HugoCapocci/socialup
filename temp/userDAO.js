var MongoClient, ObjectID, Q, authenticate, collection, createUser, getDB, retrieveUser, retrieveUserById, retrieveUserByLogin, retrieveUsers, saveUser, updateUser, updateUserTokens;

Q = require('q');

MongoClient = require('mongodb').MongoClient;

ObjectID = require('mongodb').ObjectID;

collection = "users";

getDB = function(callback) {
  return MongoClient.connect(process.env.MONGOLAB_URI, function(err, db) {
    if (err) {
      throw err;
    } else {
      return callback(db);
    }
  });
};

saveUser = function(user) {
  if (user._id === void 0) {
    return createUser(user);
  } else {
    return updateUser(user);
  }
};

createUser = function(user) {
  var deferred;
  deferred = Q.defer();
  getDB(function(db) {
    return db.collection(collection).insert(user, function(err, r) {
      db.close();
      if (err) {
        return deferred.reject(new Error(err));
      } else {
        user._id = r.insertedIds[0];
        return deferred.resolve(user);
      }
    });
  });
  return deferred.promise;
};

updateUser = function(user) {
  var deferred, query;
  deferred = Q.defer();
  query = {
    _id: user._id
  };
  getDB(function(db) {
    return db.collection(collection).update(query, user, function(err) {
      db.close();
      if (err) {
        console.log("err: ", err);
        return deferred.reject(new Error(err));
      } else {
        return deferred.resolve(user);
      }
    });
  });
  return deferred.promise;
};

updateUserTokens = function(userId, provider, tokens) {
  var fieldUpdate, query;
  query = {
    _id: new ObjectID(userId)
  };
  fieldUpdate = {
    $set: {}
  };
  fieldUpdate.$set["providers." + provider + ".tokens"] = tokens;
  return getDB(function(db) {
    return db.collection(collection).updateOne(query, fieldUpdate, {
      upsert: false
    }, function(err) {
      db.close();
      if (err) {
        return console.log("err: ", err);
      } else {
        return console.log("update token for provider " + provider + " OK");
      }
    });
  });
};

retrieveUsers = function() {
  var deferred;
  deferred = Q.defer();
  getDB(function(db) {
    return db.collection(collection).find({}).toArray(function(err, users) {
      db.close();
      if (err) {
        return deferred.reject(new Error(err));
      } else {
        return deferred.resolve(users);
      }
    });
  });
  return deferred.promise;
};

retrieveUserByLogin = function(login) {
  var query;
  query = {
    login: login
  };
  return retrieveUser(query);
};

retrieveUserById = function(userId) {
  var query;
  query = {
    _id: new ObjectID(userId)
  };
  return retrieveUser(query);
};

retrieveUser = function(query) {
  var deferred;
  deferred = Q.defer();
  getDB(function(db) {
    return db.collection(collection).findOne(query, function(err, user) {
      db.close();
      if (err) {
        return deferred.reject(new Error(err));
      } else {
        return deferred.resolve(user);
      }
    });
  });
  return deferred.promise;
};

authenticate = function(login, password) {
  var deferred;
  deferred = Q.defer();
  getDB(function(db) {
    return db.collection(collection).findOne({
      login: login,
      password: password
    }, function(err, result) {
      db.close();
      if (err) {
        return deferred.reject(new Error(err));
      } else if (result === null) {
        return deferred.reject('no user found');
      } else {
        return deferred.resolve(result);
      }
    });
  });
  return deferred.promise;
};

exports.deleteToken = function(provider, userId) {
  var deferred;
  deferred = Q.defer();
  getDB(function(db) {
    var query, unset;
    query = {
      _id: new ObjectID(userId)
    };
    unset = {
      $unset: {}
    };
    unset.$unset["providers." + provider + ".tokens"] = '';
    return db.collection(collection).update(query, unset, function(err, r) {
      db.close();
      if (err) {
        return deferred.reject(new Error(err));
      } else {
        return deferred.resolve(r.result.n);
      }
    });
  });
  return deferred.promise;
};

exports.saveUser = saveUser;

exports.retrieveUsers = retrieveUsers;

exports.updateUserTokens = updateUserTokens;

exports.authenticate = authenticate;

exports.retrieveUserByLogin = retrieveUserByLogin;

exports.retrieveUserById = retrieveUserById;
