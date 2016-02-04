var crypto, normalize;

crypto = require('crypto');

normalize = function(bytes) {
  return bytes.toString('base64').replace(/[^\w]/g, '');
};

module.exports = function(callback) {
  if (callback && typeof callback === 'function') {
    return crypto.randomBytes(32, function(ex, bytes) {
      if (ex) {
        throw ex;
      }
      return callback(normalize(bytes));
    });
  } else {
    return normalize(crypto.randomBytes(32));
  }
};
