'use strict';
var nodemailer = require('nodemailer');
var Q = require('q');
var fs = require("fs");

try {
    require('../../localeConfig.js');
} catch (error) {
    console.warn("No configuration file found");
}

// create reusable transporter object using SMTP transport
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
    }
});

// NB! No need to recreate the transporter object. You can use
// the same transporter object for all e-mails


exports.sendMail = function (message, mailTo) {
    
    console.log("sendMail");
    
    var deferred = Q.defer();
    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: 'socialup@gmail.com', // sender address
        to: mailTo, // list of receivers
        subject: '', // Subject line
        text: message, // plaintext body
        html: loadTemplate(message) // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            deferred.reject(error);
        } else {
            deferred.resolve(info.response);
            console.log('Message sent: ' + info.response);
        }
    });
    return deferred.promise;
};

function loadTemplate(message) {
    var template = fs.readFileSync('server/templates/resetPassword.html', 'utf-8');    
    return template.replace("%URL%", "http://localhost:5000/#/resetPassword"); 
}