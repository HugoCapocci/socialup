nodemailer = require('nodemailer')
Q = require('q')
fs = require("fs")

try  require('../../localeConfig.js')
catch
  console.warn("No configuration file found")

#create reusable transporter object using SMTP transport
transporter = nodemailer.createTransport
  service: 'Gmail'
  auth:
    user: process.env.GMAIL_USER
    pass: process.env.GMAIL_PASSWORD

#NB! No need to recreate the transporter object. You can use
#the same transporter object for all e-mails

exports.sendMail = (message, mailTo) ->
    
  console.log("sendMail")
  deferred = Q.defer()
  #setup e-mail data with unicode symbols
  mailOptions =
    from: 'socialup@gmail.com'
    to: mailTo
    subject: ''
    text: message
    html: loadTemplate(message)

  #send mail with defined transport object
  transporter.sendMail mailOptions, (error, info) ->
    if error
      deferred.reject(error)
    else
      deferred.resolve(info.response)
      console.log('Message sent: ' + info.response)

  deferred.promise

loadTemplate = (message) ->
  template = fs.readFileSync('server/templates/resetPassword.html', 'utf-8')
  template.replace("%URL%", "http://localhost:5000/#/resetPassword")
