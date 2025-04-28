require('dotenv').config()
const nodemailer = require("nodemailer");
const { signupEmail, sendWorkerEmail } = require('./templetes');
let smtpUser = process.env.SMTPUSER
let smtpPass = process.env.SMTPPASS
let smtpHost = process.env.SMTPHOST

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: 465,
  secure: true, 
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },             
});

const sendOTPVerificationEmail = async (email, otp) => {
  // console.log("EMAIL AND OTP====>>>>", email, otp)
  let htmlContent = signupEmail(otp);

  let mail_option = {
    from: `AZ Work <${smtpUser}>`,
    to: email,
    subject: "Verification Code: Complete Your Sign In",
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mail_option);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('Failed to send email:', error);    
    throw error;
  }
};

const sendEmailToWorker = async ({email, username, company_name, password}) => {
  let htmlContent = sendWorkerEmail({email, username, company_name, password});
  let mail_option = {
    from: `AZ Work <${smtpUser}>`,
    to: email,
    subject: `${company_name} - Worker Account Created`,
    html: htmlContent,
  };

  return transporter.sendMail(mail_option, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};


module.exports = {
  sendOTPVerificationEmail,
  sendEmailToWorker
}
