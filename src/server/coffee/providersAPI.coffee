###
# LOAD AUTOMATICALLY ALL APIS DEFINED IN "api" SUBFOLDER
# ONLY FILES WITH 'API' SUFFIX WILL BE TAKEN INTO ACCOUNT
###

fs = require('fs')
APIs = {}

for fileName in fs.readdirSync(__dirname+'/api')
  index = fileName.lastIndexOf('API')
  #only add file with sufix 'API'
  if index isnt -1
    key = fileName.substring(0, index)
    APIs[key] = require('./api/'+fileName)
    
module.exports = APIs