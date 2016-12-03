chai = require 'chai'
chaiAsPromised = require 'chai-as-promised'
sinonchai = require 'sinon-chai'
chai.use chaiAsPromised
chai.use sinonchai
fs = require 'fs'
should = chai.should
sinon = require 'sinon'

require('dotenv').config()

Promise = require 'bluebird'
UserDAO = require '../../src/server/coffee/userDAO'
userDAO = new UserDAO()

describe.skip 'UserDAO', ->

  deleteTestData = (done) ->
    MongoClient = require('mongodb').MongoClient
    MongoClient.connect process.env.MONGOLAB_URI, (err, db) ->
      db.collection 'users'
      .remove login: $in: ['test', 'test2', 'test3'], ->
        db.close()
        done()

  before (done) ->
    @timeout 5000
    deleteTestData done

  before (done) ->
    @timeout 5000
    deleteTestData done

  beforeEach ->
    @sandbox = sinon.sandbox.create()
    @sandbox.stub(userDAO, 'getDB').returns Promise.resolve
      collection: ->
        insert: ->
          ops: ['createdUser']
        update: ->
        findOne: -> 'userFound'
        find: -> toArray: -> 'usersFound'
      close: ->

  afterEach ->
    @sandbox.restore()

  it 'saveUser should create new User', (done) ->
    @sandbox.stub(userDAO, 'createUser').returns Promise.resolve 'createdUser'
    user = login: 'new'
    userDAO.saveUser user
    .then (createdUser) ->
      userDAO.createUser.calledWithExactly(user).should.be.true
      createdUser.should.equal 'createdUser'
      done()

  it 'saveUser should update existing User', (done) ->
    @sandbox.stub(userDAO, 'updateUser').returns Promise.resolve 'updatedUser'
    user = login: 'test3', newParam: 'newValue', _id: 'fakeId'
    userDAO.saveUser user
    .then (updatedUser) ->
      userDAO.updateUser.calledWithExactly(user).should.be.true
      updatedUser.should.equal 'updatedUser'
      done()

  it 'should retrieveUserById', (done) ->
    @sandbox.stub(userDAO, 'retrieveUser').returns Promise.resolve 'fakeUser'
    userDAO.retrieveUserById '507f1f77bcf86cd799439011'
    .then (user) ->
      userDAO.retrieveUser.calledWithExactly(_id: '507f1f77bcf86cd799439011').should.be.true
      user.should.equal 'fakeUser'
      done()

  it 'should retrieveUserByLogin', (done) ->
    @sandbox.stub(userDAO, 'retrieveUser').returns Promise.resolve 'dummyUser'
    userDAO.retrieveUserByLogin 'fakeLogin'
    .then (user) ->
      userDAO.retrieveUser.calledWithExactly(login: 'fakeLogin').should.be.true
      user.should.equal 'dummyUser'
      done()

  it 'should call collection.insert when create User', (done) ->
    userDAO.createUser 'fakeUser'
    .then (createdUser) ->
      createdUser.should.equal 'createdUser'
      done()

  it 'should call collection.update when update User', (done) ->
    userDAO.updateUser _id: 'fakeUser'
    .then (updatedUser) ->
      updatedUser.should.have.property '_id', 'fakeUser'
      done()

  it 'should call collection.findOne when retrieve user', (done) ->
    userDAO.retrieveUser 'userToFind'
    .then (userFound) ->
      userFound.should.equal 'userFound'
      done()

  it 'should call collection.find when retrieve all users', (done) ->
    userDAO.retrieveUsers()
    .then (usersFound) ->
      usersFound.should.equal 'usersFound'
      done()

  #updateUserTokens

  #authenticate

  #deleteToken
