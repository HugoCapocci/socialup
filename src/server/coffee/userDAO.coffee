Promise = require 'bluebird'
MongoDB = require 'mongodb'
Promise.promisifyAll MongoDB
MongoClient = MongoDB.MongoClient
Promise.promisifyAll MongoClient
ObjectID = MongoDB.ObjectID
collection = 'users'

module.exports = class UserDAO
  constructor: ->

  getDB: ->
    MongoClient.connect process.env.MONGOLAB_URI

  createUser: (user) ->
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).insert user
    .then (r) ->
      @db.close()
      r.ops[0]

  updateUser: (user) ->
    query = _id: user._id
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).update query, user
    .then ->
      @db.close()
      user

  retrieveUser: (query) ->
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).findOne query
    .then (user) ->
      @db.close()
      user

  retrieveUsers: ->
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).find({}).toArray()
    .then (users) ->
      @db.close()
      users

  saveUser: (user) ->
    if not user._id?
      @createUser user
    else
      @updateUser user

  updateUserTokens: (userId, provider, tokens) ->
    query = _id: new ObjectID userId
    fieldUpdate = $set : {}
    fieldUpdate.$set["providers.#{provider}.tokens"] = tokens
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).updateOne query, fieldUpdate, {upsert: false}
    .then ->
      console.log "update token for provider #{provider} OK"
      @db.close()

  retrieveUserByLogin: (login) ->
    query = login: login
    @retrieveUser query

  retrieveUserById: (userId) ->
    query = _id: new ObjectID userId
    @retrieveUser query

  authenticate: (login, password) ->
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      @db.collection(collection).findOne {login: login, password: password}
    .then (result) ->
      @db.close()
      return Promise.reject 'no user found' unless result?
      result

  deleteToken: (provider, userId) ->
    @db = null
    @getDB()
    .then (db) ->
      @db = db
      query = _id: new ObjectID userId
      unset = $unset: {}
      unset.$unset["providers.#{provider}.tokens"] = ''
      @db.collection(collection).update query, unset
    .then (r) ->
      @db.close()
      r.result.n
