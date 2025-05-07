const express = require('express');
const workerController = require('../controllers/worker/worker');
const workervalidation = require('../validation/worker.validation');
const { verifyToken } = require('../middleware/verifyToken');
const { upload } = require('../helpers/storage');
const router = express.Router();

const uploadFile = upload.fields([
    { name: 'clock_images' },
]);


router.post("/clock_entry", verifyToken, workerController.addclockEntrry);
router.get("/active_project_list", verifyToken, workerController.getProjectList)
router.get("/all_project_list", verifyToken, workerController.AllProjectList)
router.get("/history", verifyToken, workerController.getHistrory)
router.post("/add_clock_images", verifyToken, uploadFile, workervalidation.addclockImgaes(), workerController.addclockImgaes)

router.get("/absences_list", verifyToken, workerController.absencesList)
router.post("/send_absence_request", verifyToken, workervalidation.sendAbsencesRequest(), workerController.sendAbsencesRequest)
router.get("/absences_request_list", verifyToken, workervalidation.workerAbsenceRequestList(), workerController.workerAbsenceRequestList)


router.get("/account_detail", verifyToken, workerController.accountDetail)

router.get("/home_screen_count", verifyToken, workerController.homeScreenCount)



module.exports = router;