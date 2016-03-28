fs = require 'fs'
should = require 'should'

require '../../localeConfig' unless process.env.MONGOLAB_URI?

UserDAO = require '../../src/server/coffee/userDAO'
userDAO = new UserDAO

describe 'UserDAO', ->

  deleteTestData = (done) ->
    MongoClient = require('mongodb').MongoClient
    MongoClient.connect process.env.MONGOLAB_URI, (err, db) ->
      db.collection 'users'
      .remove login: $in: ['test', 'test2', 'test3'], ->
        db.close()
        done()

  before (done) ->
    @timeout 10000
    deleteTestData done

  before (done) ->
    @timeout 10000
    deleteTestData done

  it 'create new User', (done) ->
    @timeout 10000
    userDAO.saveUser login: 'test'
    .then (result) ->
      should.exist result._id
      done()
    .catch (error) -> done error

  it 'retrieve User', (done) ->
    @timeout 10000
    userDAO.saveUser login: 'test2'
    .then ->
      userDAO.retrieveUserByLogin 'test2'
    .then (result) ->
      ('test2').should.equal result.login
      done()
    .catch (error) -> done error

  it 'update User', (done) ->
    @timeout 15000
    user = login: 'test3', newParam : 'newValue'
    userDAO.saveUser login: 'test3'
    .then ->
      userDAO.retrieveUserByLogin 'test3'
    .then (userFound) ->
      ('test3').should.equal userFound.login
      should.exist userFound._id
      user._id = userFound._id
      userDAO.saveUser user
    .then (userUpdated) ->
      should.exist userUpdated._id
      ('newValue').should.equal userUpdated.newParam
      done()
    .catch (error) -> done error
