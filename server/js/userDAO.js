'use strict';
var Q = require('q');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

var uri = process.env.MONGOLAB_URI;
var collection = "users";

function getDB(callback) {
     MongoClient.connect(uri, function(err, db) {
         if(err)
             throw err;
         else
             callback(db);
     });
}

//save user and its provider tokens
function saveUser(user) {

    if(user._id === undefined)
        return createUser(user);
     else 
        return updateUser(user);
}

function createUser(user) {
        
    var deferred = Q.defer();
    getDB(function(db) {
        //console.log('update event '+eventId+' with result: ', result);
        db.collection(collection).insert(user, function(err, r) {
            //console.log("user saved ?", r.result);
            db.close();
            if(err)
                deferred.reject(new Error(err));
            else {
                user._id=r.insertedIds[0];
                deferred.resolve(user);
            }
        });
    });
    return deferred.promise;  
}

function updateUser(user) {
    
    // console.log("update user: ", user);
    var deferred = Q.defer();
    var query = {
        _id : user._id
    };
    getDB(function(db) {
        //console.log('query: ', query);
        db.collection(collection).update(query, user, function(err/*, r*/) {
            db.close();
            if(err) {
                console.log("err: ", err);
                deferred.reject(new Error(err));
            } else
                deferred.resolve(user);
        });
    });
    return deferred.promise;  
}

//asynch
function updateUserTokens(userId, provider, tokens) {
       
    var query = {
        _id : new ObjectID(userId)
    };
    var fieldUpdate = {
        $set : {}
    };
    fieldUpdate.$set["tokens."+provider]=tokens;
    
    getDB(function(db) {
        db.collection(collection).updateOne(query, fieldUpdate, {upsert:false}, function(err/*, r*/) {
            db.close();
            if(err) {
                console.log("err: ", err);
            } else
                console.log("update token for provider "+provider+" OK");
        });
    });
}

function retrieveUsers() {
    
    var deferred = Q.defer();
    getDB(function(db) {
        //console.log('update event '+eventId+' with result: ', result);
        db.collection(collection).find({}).toArray(function(err, users) {
            //console.log("user retrieved ?", result);
            db.close();
            if(err)
                deferred.reject(new Error(err));
            else
                deferred.resolve(users);
        });
    });
    return deferred.promise;     
}

function retrieveUserByLogin(login) {
    
    var deferred = Q.defer();
    getDB(function(db) {
        //console.log('update event '+eventId+' with result: ', result);
        db.collection(collection).findOne({login:login}, function(err, user) {
            //console.log("user retrieved ?", result);
            db.close();
            if(err)
                deferred.reject(new Error(err));
            else
                deferred.resolve(user);
        });
    });
    return deferred.promise;     
}

function authenticate(login, password) {
     
    var deferred = Q.defer();
    getDB(function(db) {
        db.collection(collection).findOne({login:login, password:password}, function(err, result) {
            //console.log("user retrieved ?", result);
            db.close();
            if(err)
                deferred.reject(new Error(err));
            else
                deferred.resolve(result);
        });
    });
    return deferred.promise;   
}

exports.saveUser=saveUser;
exports.retrieveUsers=retrieveUsers;
exports.updateUserTokens=updateUserTokens;
exports.authenticate=authenticate;
exports.retrieveUserByLogin=retrieveUserByLogin;