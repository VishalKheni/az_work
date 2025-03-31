require('dotenv').config()
const db = require("../config/db");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { sendOTPVerificationEmail } = require("../helpers/email");
const { validateMobile, } = require('../helpers/twilio');
const { Op, where, Sequelize, col } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
let path = require('path');
let fs = require('fs');

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

exports.signUp = async (req, res) => {
  const { firstname, lastname, country_code, iso_code, phone_number, user_role } = req.body;

  let valid = await validateMobile(iso_code, phone_number)
  if (valid.status == 0) {
    return res.status(400).json({ message: valid.message });
  }

  try {
    let existingUser = await db.User.findOne({
      where: {
        country_code: country_code,
        iso_code: iso_code,
        phone_number: phone_number
      }
    });

    if (existingUser) {
      return res.status(400).json({ status: 0, message: 'User already exists' });
    }

    const user = await db.User.create({
      firstname: firstname,
      lastname: lastname,
      country_code: country_code,
      iso_code: iso_code,
      phone_number: phone_number,
      user_role: user_role
    });


    return res.status(200).json({ status: 1, message: 'User created successfully', user });

  } catch (error) {
    console.error('Error while signup:', error);
    return res.status(500).json({ status: 0, message: 'Internal server error' });
  }
}

exports.addCompany = async (req, res) => {
  const { user_id, branch_id, company_name, email, country_code, iso_code, phone_number, address } = req.body;
  const { company_logo } = req.files;
  console.log('req.files', req.files)
  console.log('req.body', req.body)

  try {
    let valid = await validateMobile(iso_code, phone_number)
    if (valid.status == 0) {
      return res.status(400).json({ message: valid.message });
    }

    const owner = await db.User.findByPk(user_id);
    if (!owner) {
      return res.status(400).json({ status: 0, message: 'User not found' });
    }

    // const branch = await db.Branch.findByPk(branch_id);
    // if (!branch) {
    //   return res.status(400).json({ status: 0, message: 'Branch not found' });
    // }

    const company = await db.Company.create({
      owner_id: user_id,
      // branch_id: branch_id,
      company_logo: `company_logo/${company_logo[0].filename}`,
      company_name,
      email,
      country_code,
      iso_code,
      phone_number,
      address
    });

    return res.status(200).json({ status: 1, message: 'company created successfully', company });

  } catch (error) {
    console.error('Error while adding company:', error);
    return res.status(500).json({ status: 0, message: 'Internal server error' });

  }
}


exports.createPassword = async (req, res) => {
  const { user_id, email, password } = req.body;

  try {
    const user = await db.User.findByPk(user_id);
    if (!user) {
      return res.status(400).json({ status: 0, message: 'User not found' });
    }

    if (email === user.email) {
      return res.status(400).json({ status: 0, message: 'Email alrady exists' });
    }
    const otp = generateOTP();
    const otpCreatedAt = moment().toDate();

    const hashedPassword = await bcrypt.hash(password, 10);
    await user.update({
      email,
      password: hashedPassword,
      is_company_add: true,
      otp: otp,
      otp_created_at: otpCreatedAt
    });

    await sendOTPVerificationEmail(email, otp);

    return res.status(200).json({ status: 1, message: "OTP sent to email for registration!", data: otp });

  } catch (error) {
    console.error('Error while creating password:', error);
    return res.status(500).json({ status: 0, message: 'Internal server error' });
  }
}

exports.verifyOtpEmail = async (req, res) => {
  const { email, otp, device_id, device_token, device_type } = req.body;

  try {
    // Find the user by email
    const user = await db.User.findOne({ where: { email: email } });

    if (!user) {
      return res.status(404).json({ status: 0, message: "User not found" });
    }

    // Check if the OTP exists
    if (user.otp !== parseInt(otp)) {
      return res.status(400).json({ status: 0, message: "Invalid OTP" });
    }

    const currentTime = new Date();
    const otpAgeInMinutes = (currentTime - user.otp_created_at) / (1000 * 60); 

    if (otpAgeInMinutes > 1) {
      await user.update({ otp: null, otp_created_at: null });
      return res.status(400).json({ status: 0, message: "OTP has expired" });
    }

    // OTP is valid, so clear the OTP fields
    await user.update({ otp: null, otp_created_at: null, is_email_verified: true });
    const tokenRecord = await db.Token.create({ user_id: user.id, device_id, device_type, device_token, refresh_token: uuidv4(), token_expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    const token = jwt.sign({ user_id: user.id, token_id: tokenRecord.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    return res.status(201).json({
      status: 1,
      message: "User registered successfully",
      access_token: token,
      refresh_token: tokenRecord.refresh_token,
      data: user
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ status: 0, message: 'Internal server error' });
  }
};