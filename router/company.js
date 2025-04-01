const express = require('express');
const companyController = require('../controllers/company');
const authvalidation = require('../validation/auth.validation');
const { verifyToken } = require('../middleware/verifyToken');
const { upload } = require('../helpers/storage')
const router = express.Router();

const uploadFile = upload.fields([
    { name: 'company_logo' },
]);

router.get('/branch_list', companyController.branchList);

router.get('/detail', verifyToken, companyController.companyDetail);

module.exports = router