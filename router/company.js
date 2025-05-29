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

// Company
router.get('/detail', verifyToken, checkUserRole(['company']), companyController.companyDetail);
router.put('/edit_company', uploadFile, verifyToken, checkUserRole(['company']), companyvalidation.editCompany(), companyController.editCompany);
router.get('/get_working_hour', verifyToken, checkUserRole(['company']), companyvalidation.getCompanyMonthlyHours(), companyController.getCompanyMonthlyHours);
router.get('/get_weakly_hour', verifyToken, checkUserRole(['company']), companyvalidation.getWeeklyHours(), companyController.getWeeklyHours);
router.get('/dashboard_count', verifyToken, checkUserRole(['company']), companyController.dashboardCount);
router.get('/dashboard_request_list', verifyToken, checkUserRole(['company']), companyvalidation.dashboardRequestList(), companyController.dashboardRequestList);
router.get('/upcoming_holiday_list', verifyToken, checkUserRole(['company']), companyvalidation.upcomingHolidayList(), companyController.upcomingHolidayList);


// worker
router.get('/worker_job_category_list', verifyToken, checkUserRole(['company']), companyController.workerJobCategoryList);
router.get('/worker_job__title_list', verifyToken, checkUserRole(['company']), companyController.workerJobTitleList);
router.post('/add_worker', verifyToken, uploadFile, checkUserRole(['company']), companyvalidation.addWorker(), companyController.addWorker);
router.get('/worker_list', verifyToken, checkUserRole(['company']), companyvalidation.getworkerList(), companyController.getWorkerList);
router.get('/worker_detail', verifyToken, checkUserRole(['company']), companyvalidation.getWorkerDetail(), companyController.getWorkerDetail);
router.delete('/delete_worker', verifyToken, checkUserRole(['company']), companyvalidation.getWorkerDetail(), companyController.deleteWorker);
router.post('/add_worker_document', verifyToken, uploadFile, checkUserRole(['company']), companyvalidation.addWorkerDocuments(), companyController.addWorkerDocuments);
router.get('/get_worker_document_list', verifyToken, checkUserRole(['company']), companyvalidation.getWorkerDocumentList(), companyController.getWorkerDocumentList);
router.delete('/delete_document', verifyToken, checkUserRole(['company']), companyvalidation.deleteDocument(), companyController.deleteDocument);
router.patch('/worker_active_deactive', verifyToken, checkUserRole(['company']), companyvalidation.workerActiveDeactive(), companyController.workerActiveDeactive);
router.patch('/edit_worker', verifyToken, uploadFile, checkUserRole(['company']), companyvalidation.editWorkerProfile(), companyController.editWorkerProfile);
router.get('/working_hour', verifyToken, checkUserRole(['company']), companyvalidation.getWorkerMonthlyHours(), companyController.getWorkerMonthlyHours);
router.get('/clock_entry_list', verifyToken, checkUserRole(['company']), companyvalidation.getWorkerTimeTable(), companyController.getWorkerTimeTable);
router.get('/clock_entry_detail', verifyToken, checkUserRole(['company']), companyvalidation.getTimetableDetail(), companyController.getTimetableDetail);
router.patch('/edit_clock_status', verifyToken, checkUserRole(['company']), companyvalidation.editTimetableStatus(), companyController.editTimetableStatus);


// Job category
router.post('/add_job_category', verifyToken, checkUserRole(['company']), companyvalidation.addJobCategory(), companyController.addJobCategory);
router.put('/edit_job_category', verifyToken, checkUserRole(['company']), companyvalidation.editJobCategory(), companyController.editJobCategory);
router.delete('/delete_job_category', verifyToken, checkUserRole(['company']), companyvalidation.deleteJobCategory(), companyController.deleteJobCategory);
router.get('/job_category_list', verifyToken, checkUserRole(['company']), companyvalidation.getJobCategoryList(), companyController.getJobCategoryList);


// Client
router.post('/add_client', verifyToken, checkUserRole(['company']), companyvalidation.addClient(), companyController.addClient);
router.put('/edit_client', verifyToken, checkUserRole(['company']), companyvalidation.editClient(), companyController.editClient);
router.delete('/delete_client', verifyToken, checkUserRole(['company']), companyvalidation.getClientDetail(), companyController.deleteClient);
router.get('/client_list', verifyToken, checkUserRole(['company']), companyvalidation.clientList(), companyController.clientList);
router.get('/client_detail', verifyToken, checkUserRole(['company']), companyvalidation.getClientDetail(), companyController.clientDetail);


// Project
router.get('/project_client_list', verifyToken, checkUserRole(['company']), companyController.projectClientList);
router.post('/add_project', verifyToken, uploadFile, checkUserRole(['company']), companyvalidation.addProject(), companyController.addProject);
router.put('/edit_project', verifyToken, checkUserRole(['company']), companyvalidation.editProject(), companyController.editProject);
router.delete('/delete_project', verifyToken, checkUserRole(['company']), companyvalidation.projectDetail(), companyController.deleteProject);
router.get('/project_list', verifyToken, checkUserRole(['company']), companyvalidation.getProjectList(), companyController.getProjectList);
router.get('/project_detail', verifyToken, checkUserRole(['company']), companyvalidation.projectDetail(), companyController.getProjectDetail);
router.post('/add_project_document', verifyToken, uploadFile, checkUserRole(['company']), companyvalidation.addProjectDocuments(), companyController.addProjectDocuments);
router.get('/project_document_list', verifyToken, checkUserRole(['company']), companyvalidation.projectDocumentList(), companyController.projectDocumentList);
router.get('/project_image_list', verifyToken, checkUserRole(['company']), companyvalidation.projectDocumentList(), companyController.projectImagesList);


// Holiday
router.post('/add_company_holiday', verifyToken, checkUserRole(['company']), companyvalidation.addCompanyHoliday(), companyController.addCompanyHoliday);
router.get('/get_company_holiday_list', verifyToken, checkUserRole(['company']), companyvalidation.getCompanyHolidaysList(), companyController.getCompanyHolidaysList);
router.patch('/edit_company_holiday', verifyToken, checkUserRole(['company']), companyvalidation.editCompanyHoliday(), companyController.editCompanyHoliday);
router.delete('/delete_company_holiday', verifyToken, checkUserRole(['company']), companyvalidation.deleteCompanyHoliday(), companyController.deleteCompanyHoliday);
router.patch('/check_holiday', verifyToken, checkUserRole(['company']), companyvalidation.deleteCompanyHoliday(), companyController.checkIsHoliday);


// Absences & Vacation
router.get('/all_absence_request_list', verifyToken, checkUserRole(['company']), companyvalidation.allAbsenceRequestList(), companyController.allAbsenceRequestList);
router.get('/absence_request_detail', verifyToken, checkUserRole(['company']), companyvalidation.absenceRequestDetail(), companyController.absenceRequestDetail);
router.patch('/absence_approve_reject', verifyToken, checkUserRole(['company']), companyvalidation.approveRejectAbsenceRequest(), companyController.approveRejectAbsenceRequest);


// Time table list
router.get('/get_time_table_list', verifyToken, checkUserRole(['company']), companyvalidation.getTimeTableList(), companyController.getTimeTableList);


module.exports = router;