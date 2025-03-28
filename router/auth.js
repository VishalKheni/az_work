const express = require('express');
// let authValidation = require('../validations/auth')
const authController = require('../controllers/auth');
const { verifyToken } = require('../middleware/verifyToken');
const router = express.Router();

// router.post('/sendOtpMail', authValidation.validateSendOTPMail(), authController.sendOtpToEmail);






module.exports = router