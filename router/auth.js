const express = require('express');
const authController = require('../controllers/auth');
const { verifyToken } = require('../middleware/verifyToken');
const router = express.Router();







module.exports = router