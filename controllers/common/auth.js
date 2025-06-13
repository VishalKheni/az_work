require('dotenv').config()
const db = require("../../config/db");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { sendOTPVerificationEmail } = require("../../helpers/email");
const { validateMobile, } = require('../../helpers/twilio');
const { validateFiles, } = require('../../helpers/fileValidation');
const { Op, where, Sequelize, col } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
let path = require('path');
let fs = require('fs');
const { validateAndSendOTPToMail } = require('../../helpers/storage');

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();


exports.sendOtpEmail = async (req, res) => {
  const { email, type, user_role } = req.body;

  try {
    if (parseInt(type) === 0) {
      const user = await validateAndSendOTPToMail(email);
      await sendOTPVerificationEmail(email, user.otp);

      return res.status(200).json({
        status: 1,
        message: user.message,
        otp: user.otp
      });
    }
    else if (parseInt(type) === 1) {
      const finduser = await db.User.findOne({ where: { email: email } });
      if (!finduser) return res.status(404).json({ status: 0, message: "Email is not registered." });
      if (user_role != finduser.user_role) {
        return res.status(400).json({ status: 0, message: `Access denied. ${finduser.user_role} cannot use ${user_role} interface. Please use the ${finduser.user_role} interface.!` });
      }
      const user = await validateAndSendOTPToMail(email);
      await sendOTPVerificationEmail(email, user.otp);
      return res.status(200).json({ status: 1, message: user.message, otp: user.otp });
    }
    else if (parseInt(type) === 2) {
      const existingUser = await db.User.findOne({
        where: {
          email: email,
          user_role: {
            [Op.or]: ["company", "admin", "worker"]
          }
        }
      });
      if (existingUser) {
        return res.status(400).json({ status: 0, message: 'Email already exists' });
      }

      const user = await validateAndSendOTPToMail(email);
      await sendOTPVerificationEmail(email, user.otp);

      return res.status(200).json({
        status: 1,
        message: user.message,
        otp: user.otp
      });
    }
    res.status(200).json({ status: 0, message: "type is not valid" });

  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ status: 0, message: 'Internal server error' });
  }
};

exports.verifyOtpAndRegister = async (req, res) => {
  const { firstname, lastname, country_code, iso_code, phone_number, company_country_code, company_iso_code, company_phone_number, email, password, otp, industry_id, company_name, address, device_id, device_token, device_type,
    weekly_hours, monthly_hours, yearly_hours } = req.body;

  const { company_logo } = req.files;

  try {
    const temp = await db.Otp.findOne({ where: { email } });
    if (!temp) return res.status(404).json({ status: 0, message: "OTP not requested for this email" });

    if (parseInt(otp) !== temp.otp) {
      return res.status(400).json({ status: 0, message: "Invalid OTP" });
    }

    const otpAge = (new Date() - temp.updatedAt) / (1000 * 60);
    if (otpAge > 5) {
      await temp.destroy();
      return res.status(400).json({ status: 0, message: "OTP expired" });
    }

    const branch = await db.Branch.findByPk(industry_id);
    if (!branch) return res.status(400).json({ status: 0, message: 'Industry not found' });

    const fileValidation = await validateFiles(company_logo, ["jpg", "jpeg", "png", "webp"], 15 * 1024 * 1024);
    if (!fileValidation.valid) return res.status(400).json({ status: 0, message: fileValidation.message });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.User.create({
      firstname,
      lastname,
      country_code: `+${country_code}`,
      iso_code,
      phone_number,
      email,
      password: hashedPassword,
      user_role: "company",
      is_account_created: true,
      is_email_verified: true,
      is_password_add: true,
      is_company_add: true,
      is_company_active: "Active",
      is_company_blocked: "Unblock"
    });

    let company = null;
    company = await db.Company.create({
      owner_id: user.id,
      industry_id,
      company_name,
      company_logo: `company_logo/${company_logo[0].filename}`,
      country_code: `+${company_country_code}`,
      iso_code: company_iso_code,
      phone_number: company_phone_number,
      address,
      weekly_hours, monthly_hours, yearly_hours,
    });

    const tokenRecord = await db.Token.create({
      user_id: user.id,
      device_id,
      device_token,
      device_type,
      refresh_token: uuidv4(),
      token_expire_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    const accessToken = jwt.sign({ user_id: user.id, token_id: tokenRecord.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });

    await temp.destroy();

    return res.status(200).json({
      status: 1,
      message: "Company registered successfully",
      access_token: accessToken,
      refresh_token: tokenRecord.refresh_token,
      user
    });

  } catch (error) {
    console.error("Error during OTP verification and registration:", error);
    return res.status(500).json({ status: 0, message: "Internal server error" });
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
    const token = jwt.sign({ user_id: user.id, token_id: storedToken.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
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
  const { email, password, device_id, device_type, device_token, user_role } = req.body;

  try {
    const user = await db.User.findOne({
      where: { email: email },
      attributes: { exclude: ['work_balance'] },
      include: [
        {
          model: db.Job_title,
          as: 'job_title',
          attributes: ['id', 'job_title'],
          required: false
        }
      ]
    });
    if (!user) return res.status(404).json({ status: 0, message: "This email is not registerd! please registerd first.." });


    if (user_role != user.user_role) {
      return res.status(400).json({ status: 0, message: `Access denied. ${user.user_role} cannot log in to the ${user_role} interface. Please use the ${user.user_role} login page.!` });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 0, message: "Incorrect password." });
    }

    if (user.user_role == "company" && user.is_company_blocked === "Block") {
      return res.status(400).json({ status: 0, message: "Your account is Blocked by admin." });
    }
    if (user.user_role == "worker" && user.is_worker_active === "Deactive") {
      return res.status(400).json({ status: 0, message: "Your account is Deactive by company." });
    }

    let tokenRecord = await db.Token.findOne({ where: { device_id, device_type, device_token, user_id: user.id } });
    if (!tokenRecord) tokenRecord = await db.Token.create({ device_id, device_type, device_token, user_id: user.id, refresh_token: uuidv4(), token_expire_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
    const token = jwt.sign({ user_id: user.id, token_id: tokenRecord.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });

    return res.status(200).json({
      status: 1,
      message: "Login successful.",
      access_token: token,
      refresh_token: tokenRecord.refresh_token,
      data: user
    });

  } catch (error) {
    console.error("Login error: ", error);
    return res.status(500).json({ status: 0, message: "Internal server error." });
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



exports.verifyOtpForResetPassword = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await db.User.findOne({ where: { email: email } });
    const temp = await db.Otp.findOne({ where: { email } });
    if (!user || !temp) return res.status(404).json({ status: 0, message: "Email is not registered." });

    // if (!temp) return res.status(404).json({ status: 0, message: "OTP not requested for this email" });

    if (parseInt(otp) !== temp.otp) {
      return res.status(400).json({ status: 0, message: "Invalid OTP" });
    }

    const otpAge = (new Date() - temp.updatedAt) / (1000 * 60);
    if (otpAge > 5) {
      await temp.destroy();
      return res.status(400).json({ status: 0, message: "OTP expired" });
    }

    await temp.destroy();

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
    if (!user) return res.status(404).json({ status: 0, message: "Email is not registered." });

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
    const profile_image = req.files?.profile_image;

    const user = await db.User.findByPk(req.user.id, {
      attributes: ['id', 'firstname', 'lastname', 'profile_image', 'updatedAt'],
    });

    if (!user) return res.status(404).json({ status: 0, message: 'User Not Found' });

    if (req.files && profile_image) {
      const validation = await validateFiles(profile_image, ["jpg", "jpeg", "png", "webp"], 5 * 1024 * 1024);
      if (!validation.valid) return res.status(400).json({ status: 0, message: validation.message });
      if (user.profile_image) {
        const oldImagePath = `public/${user.profile_image}`;
        if (fs.existsSync(oldImagePath)) { fs.unlinkSync(oldImagePath) };
      }
      // if (user.profile_image) { fs.unlinkSync(`public/${user.profile_image}`) }
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

exports.getAdminProfile = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: ['id', 'firstname', 'lastname', 'profile_image', 'email'],
    });

    if (!user) return res.status(404).json({ status: 0, message: 'User Not Found' });

    return res.status(200).json({
      status: 1,
      message: "Profile fetched successfully",
      data: user
    });
  } catch (error) {
    console.error('Error while get Admin Profile:', error);
    return res.status(500).json({ status: 0, message: 'Internal server error' });
  }
};