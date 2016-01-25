'use strict';

/*
* LOAD AUTOMATICALLY ALL APIS DEFINED IN "api" SUBFOLDER
* ONLY FILES WITH 'API' SUFFIX WILL BE TAKEN INTO ACCOUNT
*/

var fs = require('fs');

var APIs = {};
var filenames = fs.readdirSync('server/js/api');
filenames .forEach(function(fileName) {
    var index = fileName.lastIndexOf('API');
      //only add file with sufix 'API'
    if(index!==-1) {
        var key = fileName.substring(0, index);
        APIs[key] = require('./api/'+fileName);
    }
});
console.log("exports APIs: ",APIs);
module.exports = APIs;