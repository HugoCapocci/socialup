'use strict';

var crypto = require('crypto');

var normalize = function(bytes) {
  
  return bytes.toString('base64').replace( /[^\w]/g, '' );
  
}; // normalize


module.exports = function(callback) {
  
    // async mode 
    if (callback && typeof callback === 'function' ) {
    
        crypto.randomBytes(32, function(ex, bytes) {
            if (ex) 
                throw ex;
            callback(normalize(bytes));
        }); // randomBytes

    //sync mode 
    } else {
        return normalize( crypto.randomBytes(32) );
    }

};