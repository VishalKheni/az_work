const express = require('express');
const admincontroller = require('../controllers/admin');
const adminvalidation = require('../validation/admin.validation');
const { verifyToken } = require('../middleware/verifyToken');
const { upload } = require('../helpers/storage')
const router = express.Router();


router.get('/dashboard', verifyToken,  admincontroller.dashboard);

router.get('/all_company_list', verifyToken, adminvalidation.companyList(), admincontroller.companyList);
router.get('/company_detail', verifyToken, adminvalidation.companyDetail(), admincontroller.companyDetail);


router.post('/add_branch', verifyToken, adminvalidation.addBranch(), admincontroller.addBranch);
router.get('/all_branch_list', verifyToken, adminvalidation.allBranchList(), admincontroller.allBranchList);
router.put('/edit_branch', verifyToken, adminvalidation.editBranch(), admincontroller.editBranch);
router.delete('/delete_branch', verifyToken, adminvalidation.deleteBranch(), admincontroller.deleteBranch);


router.post('/add_holiday', verifyToken, adminvalidation.addHoliday(), admincontroller.addHoliday);
router.get('/get_holiday_list', verifyToken, adminvalidation.getHolidaysList(), admincontroller.getHolidaysList);
router.put('/edit_holiday', verifyToken, adminvalidation.editHoliday(), admincontroller.editHoliday);
router.delete('/delete_holiday', verifyToken, adminvalidation.deleteHoliday(), admincontroller.deleteHoliday);


router.post('/add_absence', verifyToken, adminvalidation.addAbsences(), admincontroller.addAbsences);
router.put('/edit_absence', verifyToken, adminvalidation.editAbsences(), admincontroller.editAbsences);
router.delete('/delete_absence', verifyToken, adminvalidation.deleteAbsences(), admincontroller.deleteAbsences);
router.get('/get_absence_list', verifyToken, adminvalidation.getAbsencesList(), admincontroller.getAbsencesList);

module.exports = router;