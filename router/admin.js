const express = require('express');
const admincontroller = require('../controllers/admin');
const adminvalidation = require('../validation/admin.validation');
const { verifyToken } = require('../middleware/verifyToken');
const { upload } = require('../helpers/storage')
const router = express.Router();


router.get('/all_company_list', adminvalidation.companyList(), admincontroller.companyList);

router.post('/add_branch', verifyToken, adminvalidation.addBranch(), admincontroller.addBranch);
router.get('/all_branch_list', adminvalidation.allBranchList(), admincontroller.allBranchList);
router.put('/edit_branch', adminvalidation.editBranch(), admincontroller.editBranch);
router.delete('/delete_branch', adminvalidation.deleteBranch(), admincontroller.deleteBranch);


router.post('/add_holiday', verifyToken, adminvalidation.addHoliday(), admincontroller.addHoliday);
router.get('/get_holiday_list', adminvalidation.getHolidaysList(), admincontroller.getHolidaysList);
router.put('/edit_holiday', adminvalidation.editHoliday(), admincontroller.editHoliday);
router.delete('/delete_holiday', adminvalidation.deleteHoliday(), admincontroller.deleteHoliday);

module.exports = router