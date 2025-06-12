require("dotenv").config();
const { db } = require("../config/db");
const twilio = require("twilio");
const { PhoneNumberUtil, PhoneNumberFormat } = require("google-libphonenumber");
const phoneUtil = PhoneNumberUtil.getInstance();

// const validateMobile = async (iso_code, phone_number) => {
//     const number = phoneUtil.parse(phone_number, iso_code);
//     const isValid = phoneUtil.isValidNumber(number);
//     console.log("Phone number is Valid!", isValid);
//     if (!isValid) {
//         return { status: 0, message: "Phone number is Not Valid" };
//     }
//     return { status: 1, message: "Phone number is correct" };
// };

const validateMobile = async (iso_code, phone_number) => {
    try {
        const number = phoneUtil.parse(phone_number, iso_code);
        const isValid = phoneUtil.isValidNumber(number);
        console.log("Phone number is Valid!", isValid);
        if (!isValid) {
            return { status: 0, message: "Phone number is Not Valid" };
        }
        return { status: 1, message: "Phone number is correct" };
    } catch (err) {
        console.error("Phone number validation error:", err.message);
        return { status: 0, message: "Invalid phone number format or country code" };
    }
};

module.exports = { validateMobile };
