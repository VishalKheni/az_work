const express = require('express');

let adminRouter = require('./admin');
let authRouter = require('./auth');
let companyRouter = require('./company');
let workerRouter = require('./worker');

const router = express.Router();

router.use('/admin', adminRouter);
router.use('/auth', authRouter);
router.use('/company', companyRouter);
router.use('/worker', workerRouter);

module.exports = router;