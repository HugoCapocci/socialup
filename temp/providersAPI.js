
/*
 * LOAD AUTOMATICALLY ALL APIS DEFINED IN "api" SUBFOLDER
 * ONLY FILES WITH 'API' SUFFIX WILL BE TAKEN INTO ACCOUNT
 */
var APIs, fileName, fs, i, index, key, len, ref;

fs = require('fs');

APIs = {};

ref = fs.readdirSync('server/js/api');
for (i = 0, len = ref.length; i < len; i++) {
  fileName = ref[i];
  index = fileName.lastIndexOf('API');
  if (index !== -1) {
    key = fileName.substring(0, index);
    APIs[key] = require('./api/' + fileName);
  }
}

module.exports = APIs;
