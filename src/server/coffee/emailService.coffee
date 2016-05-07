nodemailer = require 'nodemailer'
Promise = require 'bluebird'
fs = require 'fs'

try  require '../../localeConfig'
catch
  console.warn 'No configuration file found'

#create reusable transporter object using SMTP transport
myTransporter = nodemailer.createTransport
  service: 'Gmail'
  auth:
    user: process.env.GMAIL_USER
    pass: process.env.GMAIL_PASSWORD

TEMPLATE_PASSWORD_RESET = 'src/server/templates/resetPassword.html'
TEMPLATE_EMAIL_CONFIRMATION = 'src/server/templates/emailConfirmation.html'
#NB! No need to recreate the transporter object. You can use
#the same transporter object for all e-mails

module.exports = class EmailService

  sendMail: (message, mailTo, transporter = myTransporter) ->

    loadTemplate = ->
      template = fs.readFileSync TEMPLATE_PASSWORD_RESET, 'utf-8'
      template.replace '%URL%', 'http://localhost:5000/#/resetPassword'

    console.log 'sendMail'
    deferred = Promise.pending()
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
        deferred.reject error
      else
        deferred.resolve info.response
        console.log 'Message sent: ' + info.response
    deferred.promise

  sendConfirmationMail: (mailTo, userId, transporter = myTransporter) ->

    loadTemplate = ->
      template = fs.readFileSync TEMPLATE_EMAIL_CONFIRMATION, 'utf-8'
      template.replace '%URL%', 'http://localhost:5000/#/confirm?id=' + userId

    console.log 'sendMail'
    deferred = Promise.pending()
    #setup e-mail data with unicode symbols
    mailOptions =
      from: 'socialup@gmail.com'
      to: mailTo
      subject: ''
      text: 'yo'
      html: loadTemplate()

    #send mail with defined transport object
    transporter.sendMail mailOptions, (error, info) ->
      if error
        deferred.reject error
      else
        deferred.resolve info.response
        console.log 'Message sent: ' + info.response
    deferred.promise
