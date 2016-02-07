fs = require 'fs'
should = require 'should'

if process.env.MONGOLAB_URI is undefined
  try require '../../localeConfig.js'
  catch
    console.log "No configuration file found"

UserDAO = require '../coffee/userDAO'
userDAO = new UserDAO

describe.only "userDAO tests", ->
    
  deleteTestData = (done) ->
    MongoClient = require('mongodb').MongoClient
    MongoClient.connect process.env.MONGOLAB_URI, (err, db) ->
      db.collection "users" 
      .remove login:'test', ->
        db.close()
        done()
    
  before (done) ->
    this.timeout 10000
    deleteTestData done

  after (done) ->
    this.timeout 10000
    deleteTestData done

  it "create new User", (done) ->
      this.timeout 10000
      user =
        login: 'test'
      userDAO.saveUser user 
      .then (result) ->
        should.exist result._id
        done()

  it "retrieve User", (done) ->
    this.timeout 10000
    userDAO.retrieveUserByLogin 'test'
    .then (result) ->
      ('test').should.equal result.login
      done()

  it "update User", (done) ->
    this.timeout(15000)
    user =
      login: 'test'
      newParam : 'newValue'
    userDAO.retrieveUserByLogin 'test' 
    .then (result) ->

      ('test').should.equal result.login
      should.exist result._id
      user._id = result._id
      userDAO.saveUser user
      .then (result2) ->
        should.exist result2._id
        ('newValue').should.equal result2.newParam
        done()
      ,(err) ->
        console.log "error : ", err
        done err
