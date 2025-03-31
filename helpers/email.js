require('dotenv').config()
const { signupEmail, forgetPassword } = require('./templetes');
const fs = require('fs');
const path = require('path');
const nodemailer = require("nodemailer");
let smtpUser = process.env.SMTPUSER
let smtpPass = process.env.SMTPPASS


const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: smtpUser,
        pass: smtpPass,
    },
});


const sendOTPVerificationEmail = async (email, otp) => {
    console.log("EMAIL AND OTP====>>>>", email, otp)
    let htmlContent = signupEmail(otp);

    let mail_option = {
        from: `AZ Work <${smtpUser}>`,
        to: email,
        subject: "Verification Code: Complete Your Sign In",
        text: `Your OTP is: ${otp}`,
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


module.exports = { sendOTPVerificationEmail }
