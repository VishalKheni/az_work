require('dotenv').config()
const db = require("../../config/db");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { sendOTPVerificationEmail, sendForgetPassOTPVerificationEmail } = require("../../helpers/email");
const { validateMobile, } = require('../../helpers/twilio');
const { validateFiles, } = require('../../helpers/fileValidation');
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
    let existingUser = await db.User.findOne({ where: { country_code: country_code, iso_code: iso_code, phone_number: phone_number } });
    if (existingUser) return res.status(400).json({ status: 0, message: 'User already exists' });

    const user = await db.User.create({
      firstname: firstname,
      lastname: lastname,
      country_code: country_code,
      iso_code: iso_code,
      phone_number: phone_number,
      user_role: user_role,
      is_account_created: true,
    });

    return res.status(200).json({ status: 1, message: 'User created successfully', user });

  } catch (error) {
    console.error('Error while signup:', error);
    return res.status(500).json({ status: 0, message: 'Internal server error' });
  }
}

exports.addCompany = async (req, res) => {
  const { user_id, industry_id, company_name, email, country_code, iso_code, phone_number, address } = req.body;
  const { company_logo } = req.files;

  try {
    let valid = await validateMobile(iso_code, phone_number)
    if (valid.status == 0) {
      return res.status(400).json({ message: valid.message });
    }

    const existingEmail = await db.Company.findOne({ where: { email: email } });
    if (existingEmail) return res.status(400).json({ status: 0, message: 'Email already exists' });

    const owner = await db.User.findByPk(user_id);
    if (!owner) return res.status(400).json({ status: 0, message: 'User not found' });

    if (!owner.is_account_created) return res.status(400).json({ status: 0, message: 'Please create account first' });
    if (owner.is_company_add) return res.status(400).json({ status: 0, message: 'Company already exists' });

    const branch = await db.Branch.findByPk(industry_id);
    if (!branch) return res.status(400).json({ status: 0, message: 'Branch not found' });

    const validation = await validateFiles(company_logo, ["jpg", "jpeg", "png", "webp"], 15 * 1024 * 1024);
    if (!validation.valid) return res.status(400).json({ status: 0, message: validation.message });


    const company = await db.Company.create({
      owner_id: owner.id,
      industry_id: branch.id,
      company_logo: `company_logo/${company_logo[0].filename}`,
      company_name,
      email,
      country_code,
      iso_code,
      phone_number,
      address
    });

    await owner.update({ is_company_add: true, });
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
      is_password_add: true,
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

    return res.status(200).json({
      status: 1,
      message: 'OTP verified successfully.',
      access_token: token,
      refresh_token: tokenRecord.refresh_token,
      data: user
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ status: 0, message: 'Internal server error' });
  }
};


exports.refreshToken = async (req, res) => {
  const { refresh_token } = req.query;
  if (!refresh_token) return res.status(400).json({ status: 0, message: "Refresh Token is required" })

  try {
    const storedToken = await db.Token.findOne({ where: { refresh_token } });
    if (!storedToken || storedToken.token_expire_at < new Date()) {
      if (storedToken) await db.Token.destroy({ where: { refresh_token } });
      return res.status(403).json({ status: 0, message: "Invalid or expired refresh token, please log in again" });
    }
    const user = await db.User.findByPk(storedToken.user_id);
    if (!user) return res.status(400).json({ status: 0, message: "User not found" });
    const token = jwt.sign({ user_id: user.id, token_id: storedToken.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    return res.status(200).json({
      status: 1,
      message: "Token refreshed successfully",
      access_token: token,
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    return res.status(500).json({ status: 0, message: 'Internal server error.', error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password, device_id, device_type, device_token } = req.body;

  try {
    const user = await db.User.findOne({ where: { email: email } });
    if (!user) return res.status(404).json({ status: 0, message: "This email is not registerd!please registerd first.." });


    if (user.user_role == "company") {
      if (!user.is_account_created) return res.status(400).json({ status: 2, message: "Please add account detail first.", data: user });
      else if (!user.is_company_add) return res.status(400).json({ status: 3, message: "Please add company detail first.", data: user });
      else if (!user.is_password_add && user.password == null) return res.status(400).json({ status: 4, message: "Please create a password first.", data: user });

      // Check if email is verified
      else if (!user.is_email_verified) {
        const otp = generateOTP();
        const otpCreatedAt = moment().toDate();
        await user.update({
          otp: otp,
          otp_created_at: otpCreatedAt
        });
        await sendOTPVerificationEmail(email, otp);
        return res.status(400).json({ status: 5, message: "Email is not verified. Please verify your email.", otp });
      }
    }


    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 0, message: "Incorrect password." });
    }

    let tokenRecord = await db.Token.findOne({ where: { device_id, device_type, device_token, user_id: user.id } });
    if (!tokenRecord) tokenRecord = await db.Token.create({ device_id, device_type, device_token, user_id: user.id, refresh_token: uuidv4(), token_expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    const token = jwt.sign({ user_id: user.id, token_id: tokenRecord.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    return res.status(200).json({
      status: 1,
      message: "Login successful.",
      access_token: token,
      refresh_token: tokenRecord.refresh_token,
      data: user
    });

  } catch (error) {
    console.error("Login error: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};


exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const user_id = req.user.id;
    const user = await db.User.findByPk(user_id)

    if (!user) {
      return res.status(404).json({ status: 0, message: 'User not found' });
    }

    if (oldPassword === newPassword) {
      return res.status(200).json({ Status: 0, message: 'Both password are same please choose another new password' });
    }

    // Check if old password matches
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ status: 0, message: 'Old password is incorrect' });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    await user.update({ password: hashedNewPassword });

    return res.status(200).json({ status: 1, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ status: 0, message: "Internal server error." });
  }
};

exports.logOut = async (req, res) => {
  try {
    await req.token.destroy();
    return res.status(200).json({ status: 1, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ status: 0, message: "Internal server error." });
  }
};


exports.sendOtpToEmail = async (req, res) => {
  const { email } = req.body;

  try {
    let user = await db.User.findOne({ where: { email: email } });

    if (!user) return res.status(404).json({ status: 0, message: "Email is not registered." });

    const otp = generateOTP();
    const otpCreatedAt = moment().toDate();
    await user.update({ otp: otp, otp_created_at: otpCreatedAt });
    await sendForgetPassOTPVerificationEmail(email, otp);
    return res.status(200).json({ status: 1, message: "OTP sent to email for password reset!", data: otp });
  } catch (error) {
    console.error('Error sending OTP to email:', error);
    return res.status(500).json({ status: 0, message: 'Internal server error' });
  }
};

exports.verifyOtpForResetPassword = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await db.User.findOne({ where: { email: email } });

    if (!user) return res.status(404).json({ status: 0, message: "User not found" });

    if (user.otp !== parseInt(otp)) return res.status(400).json({ status: 0, message: "Invalid OTP" });

    const currentTime = new Date();
    const otpAgeInMinutes = (currentTime - user.otp_created_at) / (1000 * 60);

    if (otpAgeInMinutes > 1) {
      await user.update({ otp: null, otp_created_at: null });
      return res.status(400).json({ status: 0, message: "OTP has expired" });
    }
    await user.update({ otp: null, otp_created_at: null, is_email_verified: true });
    return res.status(200).json({
      status: 1,
      message: 'OTP verified successfully.',
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ status: 0, message: 'Internal server error' });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { email, newpassword } = req.body;

    let user = await db.User.findOne({ where: { email: email } });
    if (!user) return res.status(404).json({ status: 0, message: "No account associated with this email." });

    const newHashedPassword = await bcrypt.hash(newpassword, 10);
    await db.User.update({ password: newHashedPassword }, { where: { id: user.id } });
    await db.Token.destroy({ where: { user_id: user.id } });

    return res.status(200).json({
      status: 1,
      message: "Your password has been reset successfully!"
    });
  } catch (error) {
    console.error("Error in resetPassword: ", error);
    res.status(500).json({
      status: 0,
      message: "Internal Server Error!",
    });
  }
};


exports.editProfile = async (req, res) => {
  try {
    const { firstname, lastname } = req.body;
    const { profile_image } = req.files;

    const user = await db.User.findByPk(req.user.id, {
      attributes: ['id', 'firstname', 'lastname', 'profile_image', 'updatedAt'],
    });

    if (!user) return res.status(404).json({ status: 0, message: 'User Not Found' });

    if (profile_image) {
      const validation = await validateFiles(profile_image, ["jpg", "jpeg", "png", "webp"], 15 * 1024 * 1024);
      if (!validation.valid) return res.status(400).json({ status: 0, message: validation.message });
      if (user.profile_image) { fs.unlinkSync(`public/${user.profile_image}`) }
      user.profile_image = `profile_images/${profile_image[0].filename}`;
      await user.save();
    }

    await user.update({ firstname, lastname });

    return res.status(200).json({
      status: 1,
      message: "Profile update successfully",
      data: user
    });
  } catch (error) {
    console.error('Error while edit Profile:', error);
    return res.status(500).json({ status: 0, message: 'Internal server error' });
  }
};