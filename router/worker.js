const express = require('express');
const authController = require('../controllers/worker/worker');
// const authvalidation = require('../validation/auth.validation');
const { verifyToken } = require('../middleware/verifyToken');
const { upload } = require('../helpers/storage');
const multer = require('multer');
const router = express.Router();


router.post("/clock_entry", verifyToken, authController.addclockEntrry);

module.exports = router;