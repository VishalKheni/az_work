const express = require('express');
const authController = require('../controllers/common/auth');
const authvalidation = require('../validation/auth.validation');
const { verifyToken } = require('../middleware/verifyToken');
const router = express.Router();
const { upload } = require('../helpers/storage');

const uploadFile = upload.fields([
    { name: 'profile_image' },
    { name: 'documents' },
    { name: 'company_logo' },
]);

router.post('/sent_otp', authvalidation.sendOtpToEmail(), authController.sendOtpEmail);
router.post('/register_company', uploadFile, authvalidation.verifyOtpAndRegister(), authController.verifyOtpAndRegister);

router.get('/refresh_token', authController.refreshToken);
router.post('/login', authvalidation.login(), authController.login);



router.post('/change_password', verifyToken, authvalidation.changePassword(), authController.changePassword);
router.post('/logout', verifyToken, authController.logOut);

router.post('/verify_otp_email', authvalidation.verifyOtpForResetPassword(), authController.verifyOtpForResetPassword);
router.post('/reset_password', authvalidation.resetPassword(), authController.resetPassword);

router.put('/edit_profile', verifyToken, uploadFile, authvalidation.editProfile(), authController.editProfile);
router.get('/get_profile', verifyToken, authController.getAdminProfile);

module.exports = router;