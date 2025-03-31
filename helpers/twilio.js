require("dotenv").config();
const { PhoneNumberUtil, PhoneNumberFormat } = require("google-libphonenumber");
const { db } = require("../config/db");
const twilio = require("twilio");
const phoneUtil = PhoneNumberUtil.getInstance();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);
// console.log("twilio", accountSid, authToken,process.env.TWILIO_PHONE_NUMBER)

const sendSMS = async (to, otp) => {
    try {

        // const formatted = phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL);
        let messageBody = `Your OTP for verification from CarWash is: ${otp}. Please enter it within 1 minute to complete your request.`;
        const message = await client.messages.create({
            body: messageBody,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to,
        });

        console.log(`Message sent: ${message.sid}`);
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const validateMobile = async (iso_code, phone_number) => {
    const number = phoneUtil.parse(phone_number, iso_code);
    const isValid = phoneUtil.isValidNumber(number);
    console.log("Phone number is Valid!", isValid);
    if (!isValid) {
        return { status: 0, message: "Phone number is Not Valid" };
    }
    return { status: 1, message: "Phone number is correct" };
};

module.exports = { validateMobile };