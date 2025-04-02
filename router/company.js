const express = require('express');
const companyController = require('../controllers/company');
const companyvalidation = require('../validation/company.validation');
const { verifyToken } = require('../middleware/verifyToken');
const { upload } = require('../helpers/storage')
const router = express.Router();

const uploadFile = upload.fields([
    { name: 'profile_image' },
    { name: 'documents' },
    { name: 'company_logo' },
]);


router.get('/branch_list', companyController.branchList);

router.get('/detail', verifyToken, companyController.companyDetail);

router.post('/add_worker', verifyToken, uploadFile, companyvalidation.addWorker(), companyController.addWorker);
router.get('/get_worker_detail', verifyToken, companyvalidation.getWorkerDetail(), companyController.getWorkerDetail);
router.delete('/delete_worker', verifyToken, companyvalidation.getWorkerDetail(), companyController.deleteWorker);


router.post('/add_job_category', verifyToken, companyvalidation.addJobCategory(), companyController.addJobCategory);

module.exports = router;