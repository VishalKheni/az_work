const express = require('express');
const authController = require('../controllers/common/auth');
const authvalidation = require('../validation/auth.validation');
const { verifyToken } = require('../middleware/verifyToken');
const { upload } = require('../helpers/storage');
const router = express.Router();

const uploadFile = upload.fields([
    { name: 'profile_image' },
    { name: 'documents' },
    { name: 'company_logo' },
]);

router.get('/refresh_token', authController.refreshToken);
router.post('/login', authvalidation.login(), authController.login);
router.post('/signup', authvalidation.signUp(), authController.signUp);
router.post('/add_company', uploadFile, authvalidation.addCompany(), authController.addCompany);
router.post('/create_password', authvalidation.createPassword(), authController.createPassword);
router.post('/verify_signup_otp', authvalidation.verifyOtp(), authController.verifyOtpEmail);



router.post('/change_password', verifyToken, authvalidation.changePassword(), authController.changePassword);
router.post('/logout', verifyToken, authController.logOut);

router.post('/send_otp_email', authvalidation.sendOtpToEmail(), authController.sendOtpToEmail);
router.post('/verify_otp_email', authvalidation.verifyOtpForResetPassword(), authController.verifyOtpForResetPassword);
router.post('/reset_password', authvalidation.resetPassword(), authController.resetPassword);

router.put('/edit_profile', verifyToken, uploadFile, authvalidation.editProfile(), authController.editProfile);

module.exports = router;