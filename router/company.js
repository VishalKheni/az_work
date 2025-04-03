const express = require('express');
const companyController = require('../controllers/company');
const companyvalidation = require('../validation/company.validation');
const { verifyToken, checkUserRole } = require('../middleware/verifyToken');
const { upload } = require('../helpers/storage')
const router = express.Router();

const uploadFile = upload.fields([
    { name: 'profile_image' },
    { name: 'documents' },
    { name: 'company_logo' },
]);


router.get('/branch_list', companyController.branchList);

router.get('/detail', verifyToken, checkUserRole(['company']), companyController.companyDetail);

router.post('/add_worker', verifyToken, uploadFile, checkUserRole(['company']), companyvalidation.addWorker(), companyController.addWorker);
router.get('/get_worker_detail', verifyToken, checkUserRole(['company']), companyvalidation.getWorkerDetail(), companyController.getWorkerDetail);
router.delete('/delete_worker', verifyToken, checkUserRole(['company']), companyvalidation.getWorkerDetail(), companyController.deleteWorker);


router.post('/add_job_category', verifyToken, checkUserRole(['company']), companyvalidation.addJobCategory(), companyController.addJobCategory);


router.post('/add_client', verifyToken, checkUserRole(['company']), companyvalidation.addClient(), companyController.addClient);
router.put('/edit_client', verifyToken, checkUserRole(['company']), companyvalidation.editClient(), companyController.editClient);

module.exports = router;