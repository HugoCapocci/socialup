Promise = require 'bluebird'
MongoDB = require 'mongodb'
Promise.promisifyAll MongoDB
MongoClient = MongoDB.MongoClient
Promise.promisifyAll MongoClient
ObjectID = MongoDB.ObjectID
collection = 'users'

getDB = ->
  MongoClient.connect process.env.MONGOLAB_URI

createUser = (user) ->
  deferred = Promise.pending()
  @db = null
  getDB()
  .then (db) ->
    @db = db
    @db.collection(collection).insert user
  .then (r) ->
    @db.close()
    deferred.resolve r.ops[0]
  .catch (error) ->
    deferred.reject new Error error

  deferred.promise

updateUser = (user) ->
  deferred = Promise.pending()
  query = _id: user._id
  @db = null
  getDB()
  .then (db) ->
    @db = db
    @db.collection(collection).update query, user
  .then ->
    @db.close()
    deferred.resolve user
  .catch (error) ->
    deferred.reject new Error error

  deferred.promise

retrieveUser = (query) ->
  deferred = Promise.pending()
  @db = null
  getDB()
  .then (db) ->
    @db = db
    @db.collection(collection).findOne query
  .then (user) ->
    @db.close()
    deferred.resolve user
  .catch (error) ->
    deferred.reject new Error error
  deferred.promise

module.exports = class UserDAO
  constructor: ->
  #save user and its provider tokens
  saveUser: (user) ->
    if not user._id?
      createUser user
    else
      updateUser user
  #asynch
  updateUserTokens: (userId, provider, tokens) ->
    query = _id: new ObjectID userId
    fieldUpdate = $set : {}
    fieldUpdate.$set["providers.#{provider}.tokens"] = tokens
    @db = null
    getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).updateOne query, fieldUpdate, {upsert:false}
    .then ->
      console.log "update token for provider #{provider} OK"
      @db.close()
    .catch (error) ->
      console.log 'err: ', error

  retrieveUsers: ->
    deferred = Promise.pending()
    @db = null
    getDB()
    .then (db) ->
      @db = db
      #console.log('update event '+eventId+' with result: ', result)
      @db.collection(collection).find({}).toArray()
    .then (users) ->
      @db.close()
      deferred.resolve users
    .catch (error) ->
      deferred.reject new Error error

    deferred.promise

  retrieveUserByLogin: (login) ->
    query = login: login
    retrieveUser query

  retrieveUserById: (userId) ->
    query = _id: new ObjectID userId
    retrieveUser query

  authenticate: (login, password) ->
    deferred = Promise.pending()
    @db = null
    getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).findOne {login: login, password: password}
    .then (result) ->
      @db.close()
      if result is null
        deferred.reject 'no user found'
      else
        deferred.resolve result
    .catch (error) ->
      deferred.reject new Error error

    deferred.promise

  deleteToken: (provider, userId) ->
    deferred = Promise.pending()
    @db = null
    getDB()
    .then (db) ->
      @db = db
      query = _id : new ObjectID userId
      unset = $unset: {}
      unset.$unset["providers.#{provider}.tokens"] = ''
      @db.collection(collection).update query, unset
    .then (r) ->
      @db.close()
      deferred.resolve r.result.n
    .catch (error) ->
      deferred.reject new Error error

    deferred.promise
