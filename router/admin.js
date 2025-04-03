const express = require('express');
const admincontroller = require('../controllers/admin');
const adminvalidation = require('../validation/admin.validation');
const { verifyToken, checkUserRole } = require('../middleware/verifyToken');

const router = express.Router();


router.get('/dashboard', verifyToken, checkUserRole(['admin']), admincontroller.dashboard);

router.get('/all_company_list', verifyToken, checkUserRole(['admin']), adminvalidation.companyList(), admincontroller.companyList);
router.get('/company_detail', verifyToken, checkUserRole(['admin']), adminvalidation.companyDetail(), admincontroller.companyDetail);
router.patch('/active_deactive', verifyToken, checkUserRole(['admin']), adminvalidation.companyDetail(), admincontroller.companyActiveDeactive);
router.patch('/block_unblock', verifyToken, checkUserRole(['admin']), adminvalidation.companyDetail(), admincontroller.companyBockUnblock);

// branch
router.post('/add_branch', verifyToken, checkUserRole(['admin']), adminvalidation.addBranch(), admincontroller.addBranch);
router.get('/all_branch_list', verifyToken, checkUserRole(['admin']), adminvalidation.allBranchList(), admincontroller.allBranchList);
router.put('/edit_branch', verifyToken, checkUserRole(['admin']), adminvalidation.editBranch(), admincontroller.editBranch);
router.delete('/delete_branch', verifyToken, checkUserRole(['admin']), adminvalidation.deleteBranch(), admincontroller.deleteBranch);


router.post('/add_holiday', verifyToken, checkUserRole(['admin']), adminvalidation.addHoliday(), admincontroller.addHoliday);
router.get('/get_holiday_list', verifyToken, checkUserRole(['admin']), adminvalidation.getHolidaysList(), admincontroller.getHolidaysList);
router.put('/edit_holiday', verifyToken, checkUserRole(['admin']), adminvalidation.editHoliday(), admincontroller.editHoliday);
router.delete('/delete_holiday', verifyToken, checkUserRole(['admin']), adminvalidation.deleteHoliday(), admincontroller.deleteHoliday);


router.post('/add_absence', verifyToken, checkUserRole(['admin']), adminvalidation.addAbsences(), admincontroller.addAbsences);
router.put('/edit_absence', verifyToken, checkUserRole(['admin']), adminvalidation.editAbsences(), admincontroller.editAbsences);
router.delete('/delete_absence', verifyToken, checkUserRole(['admin']), adminvalidation.deleteAbsences(), admincontroller.deleteAbsences);
router.get('/get_absence_list', verifyToken, checkUserRole(['admin']), adminvalidation.getAbsencesList(), admincontroller.getAbsencesList);

module.exports = router;