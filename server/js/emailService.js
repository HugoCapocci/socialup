var EmailService,Q,error1,fs,nodemailer,transporter;nodemailer=require("nodemailer"),Q=require("q"),fs=require("fs");try{require("../../localeConfig.js")}catch(error1){console.warn("No configuration file found")}transporter=nodemailer.createTransport({service:"Gmail",auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_PASSWORD}}),module.exports=EmailService=function(){function e(){}return e.prototype.sendMail=function(e,r){var o,s;return console.log("sendMail"),o=Q.defer(),s={from:"socialup@gmail.com",to:r,subject:"",text:e,html:loadTemplate(e)},transporter.sendMail(s,function(e,r){return e?o.reject(e):(o.resolve(r.response),console.log("Message sent: "+r.response))}),o.promise},e.prototype.loadTemplate=function(e){var r;return r=fs.readFileSync("server/templates/resetPassword.html","utf-8"),r.replace("%URL%","http://localhost:5000/#/resetPassword")},e}();