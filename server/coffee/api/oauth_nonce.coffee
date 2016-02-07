crypto = require('crypto')

normalize = (bytes) ->

  bytes.toString('base64').replace( /[^\w]/g, '' )

module.exports = (callback) ->
  
  #async mode
  if callback and typeof callback is 'function'

    crypto.randomBytes 32, (ex, bytes) ->
      if ex
        throw ex
      callback normalize(bytes)

  #sync mode
  else
    normalize crypto.randomBytes(32)
