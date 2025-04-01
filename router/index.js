const express = require('express');

let adminRouter = require('./admin');
let authRouter = require('./auth');
let companyRouter = require('./company');

const router = express.Router();

router.use('/admin', adminRouter);
router.use('/auth', authRouter);
router.use('/company', companyRouter);

module.exports = router;