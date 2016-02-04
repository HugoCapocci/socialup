Q = require('q')
MongoClient = require('mongodb').MongoClient
ObjectID = require('mongodb').ObjectID
collection = "users"

getDB = (callback) ->
  MongoClient.connect process.env.MONGOLAB_URI, (err, db) ->
    if err
      throw err
    else
      callback(db)

#save user and its provider tokens
saveUser = (user) ->
  
  if user._id is undefined
    createUser(user)
  else
    updateUser(user)

createUser = (user) ->
        
  deferred = Q.defer()
  getDB (db) ->
    #console.log('update event '+eventId+' with result: ', result);
    db.collection(collection).insert user, (err, r) ->
      #console.log("user saved ?", r.result);
      db.close()
      if err
        deferred.reject new Error(err)
      else
        user._id=r.insertedIds[0]
        deferred.resolve(user)
      
  deferred.promise

updateUser = (user) ->

  deferred = Q.defer()
  query =
    _id : user._id
  
  getDB (db) ->
    db.collection(collection).update query, user, (err) ->
      db.close()
      if err
        console.log("err: ", err)
        deferred.reject new Error(err)
      else
        deferred.resolve(user)
  deferred.promise;

#asynch
updateUserTokens = (userId, provider, tokens) ->

  query =
    _id : new ObjectID(userId)

  fieldUpdate =
    $set : {}

  fieldUpdate.$set["providers."+provider+".tokens"]=tokens

  getDB (db) ->
    db.collection(collection).updateOne query, fieldUpdate, {upsert:false}, (err) ->
      db.close()
      if err
        console.log("err: ", err)
      else
        console.log("update token for provider "+provider+" OK")

retrieveUsers = ->
  
  deferred = Q.defer()
  getDB (db) ->
    #console.log('update event '+eventId+' with result: ', result);
    db.collection(collection).find({}).toArray (err, users) ->
      #console.log("user retrieved ?", result);
      db.close()
      if err
        deferred.reject new Error(err)
      else
        deferred.resolve(users)

  deferred.promise

retrieveUserByLogin = (login) ->
  
  query =
    login:login
  retrieveUser(query)

retrieveUserById = (userId) ->

  query =
    _id : new ObjectID(userId)
  retrieveUser(query)

retrieveUser = (query) ->

  deferred = Q.defer()
  getDB (db) ->
    db.collection(collection).findOne query, (err, user) ->
      db.close()
      if err
        deferred.reject new Error(err)
      else
        deferred.resolve(user)
  deferred.promise

authenticate = (login, password) ->
     
  deferred = Q.defer()
  getDB (db) ->
    db.collection(collection).findOne {login:login, password:password}, (err, result) ->
      db.close()
      if err
        deferred.reject new Error(err)
      else if result is null
        deferred.reject('no user found')
      else
        deferred.resolve(result)

  deferred.promise

exports.deleteToken = (provider, userId) ->
 
  deferred = Q.defer()
  getDB (db) ->
  
    query =
      _id : new ObjectID(userId)
    
    unset =
      $unset: {}
    
    unset.$unset["providers."+provider+".tokens"] = ''
    db.collection(collection).update query, unset, (err, r) ->
      db.close()
      if err
        deferred.reject new Error(err)
      else
        deferred.resolve(r.result.n)
   
  deferred.promise

exports.saveUser=saveUser
exports.retrieveUsers=retrieveUsers
exports.updateUserTokens=updateUserTokens
exports.authenticate=authenticate
exports.retrieveUserByLogin=retrieveUserByLogin
exports.retrieveUserById=retrieveUserById