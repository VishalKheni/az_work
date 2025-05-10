const express = require('express');
const workerController = require('../controllers/worker/worker');
const workervalidation = require('../validation/worker.validation');
const { verifyToken, checkUserRole } = require('../middleware/verifyToken');
const { upload } = require('../helpers/storage');
const router = express.Router();

const uploadFile = upload.fields([
    { name: 'clock_images' },
]);


router.post("/clock_entry", verifyToken, checkUserRole(['worker']), workervalidation.addclockEntrry(), workerController.addclockEntrry);
router.get("/active_project_list", verifyToken, checkUserRole(['worker']), workerController.getProjectList)
router.get("/all_project_list", verifyToken, checkUserRole(['worker']),workervalidation.AllProjectList(), workerController.AllProjectList)
router.get("/history", verifyToken, checkUserRole(['worker']), workervalidation.getHistrory(), workerController.getHistrory)
router.post("/add_clock_images", verifyToken, checkUserRole(['worker']), uploadFile, workervalidation.addclockImgaes(), workerController.addclockImgaes)

router.get("/get_all_work_history", verifyToken, checkUserRole(['worker']), workervalidation.pagination(), workerController.getAllWorkHistory)

router.get("/absences_list", verifyToken, checkUserRole(['worker']), workerController.absencesList)
router.post("/send_absence_request", verifyToken, checkUserRole(['worker']), workervalidation.sendAbsencesRequest(), workerController.sendAbsencesRequest)
router.get("/absences_request_list", verifyToken, checkUserRole(['worker']), workervalidation.pagination(), workerController.workerAbsenceRequestList)


router.get("/account_detail", verifyToken, checkUserRole(['worker']), workerController.accountDetail)

router.get("/home_screen_count", verifyToken, checkUserRole(['worker']), workervalidation.homeScreenCount(), workerController.homeScreenCount)
router.get("/absences_screen_count", verifyToken, checkUserRole(['worker']), workerController.absencesScreenCount)

router.get("/absences_calendar", verifyToken, checkUserRole(['worker']), workervalidation.AbsenceScrenCalendar(), workerController.AbsenceScrenCalendar)

router.delete("/delete_image", verifyToken, checkUserRole(['worker']), workervalidation.deleteimage(), workerController.deleteimage)

router.put("/edit_clock", verifyToken, checkUserRole(['worker']), workervalidation.editClockEntry(), workerController.editClockEntry)

module.exports = router;