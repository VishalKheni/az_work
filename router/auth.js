const express = require('express');
const authController = require('../controllers/auth');
const { verifyToken } = require('../middleware/verifyToken');
const { upload } = require('../helpers/storage')
const router = express.Router();

const uploadFile = upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'document', maxCount: 1 },
    { name: 'company_logo', maxCount: 5 }, // Allows up to 5 files
]);

router.post('/signup', authController.signUp);
router.post('/company', uploadFile, authController.addCompany);

router.post('/create_password',  authController.createPassword);
router.post('/verify_otp',  authController.verifyOtpEmail);

module.exports = router