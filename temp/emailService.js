var Q, error1, fs, loadTemplate, nodemailer, transporter;

nodemailer = require('nodemailer');

Q = require('q');

fs = require("fs");

try {
  require('../../localeConfig.js');
} catch (error1) {
  console.warn("No configuration file found");
}

transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  }
});

exports.sendMail = function(message, mailTo) {
  var deferred, mailOptions;
  console.log("sendMail");
  deferred = Q.defer();
  mailOptions = {
    from: 'socialup@gmail.com',
    to: mailTo,
    subject: '',
    text: message,
    html: loadTemplate(message)
  };
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      return deferred.reject(error);
    } else {
      deferred.resolve(info.response);
      return console.log('Message sent: ' + info.response);
    }
  });
  return deferred.promise;
};

loadTemplate = function(message) {
  var template;
  template = fs.readFileSync('server/templates/resetPassword.html', 'utf-8');
  return template.replace("%URL%", "http://localhost:5000/#/resetPassword");
};
