const { check, validationResult } = require("express-validator");
const { verifyToken } = require('../middleware/verifyToken');
const fs = require("fs");


const validation = (req, res, next) => {
    console.log("<<input>>req.query", req.query);
    console.log("<<input>>req.body", req.body);
    console.log("<<input>>req.file", req.file);
    console.log("<<input>>req.files", req.files);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Unlink or remove any uploaded files if validation fails
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        if (req.files) {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => {
                    fs.unlinkSync(file.path);
                });
            });
        }
        return res.status(400).json({
            Status: 0,
            message: errors.array()[0].msg,
            type: errors.array()[0].type,
            value: errors.array()[0].value,
            path: errors.array()[0].path,
            location: errors.array()[0].location,
            error: errors
        });
    }
    next();
}
const checkForUnexpectedFields = (allowedFields) => {
    return (req, res, next) => {
        // Check for unexpected fields in req.body
        const unexpectedBodyFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));

        // Check for unexpected fields in req.query
        const unexpectedQueryFields = Object.keys(req.query).filter(field => !allowedFields.includes(field));

        // Check for unexpected files in req.files
        const unexpectedFileFields = Object.keys(req.files || {}).filter(field => !allowedFields.includes(field));

        // If there are any unexpected file fields, unlink all files from the request
        if (unexpectedFileFields.length > 0) {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => {
                    fs.unlinkSync(file.path);  // Remove the file from the server
                });
            });
        }
        // Combine all unexpected fields
        const unexpectedFields = [...unexpectedBodyFields, ...unexpectedQueryFields, ...unexpectedFileFields];

        if (unexpectedFields.length > 0) {
            return res.status(400).json({ Status: 0, message: `Unexpected fields: ${unexpectedFields.join(', ')}` });
        }

        next();
    };
};


exports.editCompany = () => {
    return [
        [
            check("company_logo").custom((value, { req }) => {
                if (req.files.company_logo.length > 1) {
                    req.files.company_logo.forEach(element => {
                        fs.unlinkSync(element.path);
                    });
                    throw new Error('Maximum 1 images allowed');
                }
                return true;
            }).optional(),
            check("company_id").notEmpty().withMessage("Company ID is required."),
            check("industry_id").optional().isInt().withMessage("Industry ID must be integer."),
            check('company_name').optional().isString().withMessage('Company name Name must be sting').trim().escape(),
            check("email").optional().isString().withMessage('Email must be string').isEmail().withMessage("Invalid email format"),
            check('phone_number').optional().isString().withMessage('Phone number must be string'),
            check('iso_code').optional().isString().withMessage("ISO Code must be string").trim().escape(),
            check('country_code').optional().isString().withMessage("Country Code must be string").trim().escape(),
            check("address").optional().isString().withMessage("address must be string.").trim(),
            check('owner_phone_number').optional().isString().withMessage('Phone number must be string'),
            check('owner_firstname').optional().isString().withMessage('First Name must be sting').trim().escape(),
            check('owner_lastname').optional().isString().withMessage('Last Name must be sting').trim().escape(),
            check('owner_iso_code').optional().isString().withMessage("ISO Code must be string").trim().escape(),
            check('owner_country_code').optional().isString().withMessage("Country Code must be string").trim().escape(),
        ],
        checkForUnexpectedFields(["company_id", 'industry_id', "company_logo", "company_name", "email", "phone_number", "iso_code", "country_code", "address", "owner_firstname", "owner_lastname", "owner_phone_number", "owner_iso_code", "owner_country_code",]),
        validation
    ];
}


// Worker
exports.addWorker = () => {
    return [
        [
            check("profile_image").custom((value, { req }) => {
                if (!req.files || !req.files.profile_image) {
                    throw new Error('profile image is required');
                }
                if (req.files.profile_image.length > 1) {
                    req.files.profile_image.forEach(element => {
                        fs.unlinkSync(element.path);
                    });
                    throw new Error('Maximum 1 images allowed');
                }
                return true;
            }),
            check("documents").custom((value, { req }) => {
                if (!req.files || !req.files.documents) {
                    throw new Error('documents is required');
                }
                return true;
            }),
            check("job_category_id").notEmpty().withMessage("Job Category ID is required."),
            check("job_title_id").notEmpty().withMessage("Job ttitle ID is required."),
            check('firstname').not().isEmpty().withMessage("First Name is required")
                .isString().withMessage('First Name must be sting').trim().escape(),
            check('lastname').not().isEmpty().withMessage("Last Name is required")
                .isString().withMessage('Last Name must be sting').trim().escape(),
            check('phone_number').not().isEmpty().withMessage("phone_number is required"),
            check('iso_code').not().isEmpty().withMessage("ISO Code is required").trim().escape(),
            check('country_code').not().isEmpty().withMessage("Country Code is required").trim().escape(),
            check("email").not().isEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),
            check("address").notEmpty().withMessage("address is required."),
            check("insurance_number").not().isEmpty().withMessage("Insurance Number is required").isString().withMessage('Insurance Number must be sting').trim().escape(),
            check("employment_date").notEmpty().withMessage('Employment Date is required.').isISO8601().withMessage("Employment Date must be a valid date (YYYY-MM-DD)."),
            check("password").not().isEmpty().withMessage("Password is required").trim().escape(),
            check("vacation_days").not().isEmpty().withMessage("Vacation day is required").isInt().withMessage('Vacation day must number').trim(),
            check("experience").not().isEmpty().withMessage("Experience is required").isString().withMessage('Experience must be sting').trim(),
        ],
        checkForUnexpectedFields(["profile_image", "documents", "job_category_id", "job_title_id", "firstname", "lastname", "phone_number", "iso_code", "country_code", "email", "address", "insurance_number", "employment_date", "password", "experience", "vacation_days"]),
        validation
    ];
}

exports.getworkerList = () => {
    return [
        [
            check('page')
                .notEmpty()
                .withMessage('Page must required.')
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer.'),
            check("search").optional().isString().withMessage("search must be string").trim(),
            check("status").optional().isString().withMessage("status must be string").trim()
                .isIn(["active", 'inactive', 'blocked'])
                .withMessage("Invalid value for user_role. Allowed values are 'active' or 'inactive' or 'blocked "),
            check("filter")
                .notEmpty().withMessage('filter is required.')
                .isString().withMessage("filter must be a string")
                .isIn([
                    'id_ASC', 'id_DESC',
                    'worker_name_ASC', 'worker_name_DESC',
                    'employment_date_ASC', 'employment_date_DESC',
                    'category_ASC', 'category_DESC',
                    'title_ASC', 'title_DESC'
                ]).withMessage("Invalid value for filter. Allowed values are: id_ASC, id_DESC, worker_name_ASC, worker_name_DESC, employment_date_ASC, employment_date_DESC, category_ASC, category_DESC, title_ASC, title_DESC").trim()
        ],
        checkForUnexpectedFields(["page", "limit", "search", "status", "filter"]),
        validation
    ];
}

exports.getWorkerDetail = () => {
    return [
        [
            check("worker_id").notEmpty().withMessage("Worker ID is required."),
        ],
        checkForUnexpectedFields(["worker_id"]),
        validation
    ];
}

exports.addWorkerDocuments = () => {
    return [
        [
            check("documents").custom((value, { req }) => {
                if (!req.files || !req.files.documents) {
                    throw new Error('documents is required');
                }
                return true;
            }),
            check("worker_id").notEmpty().withMessage("Worker ID is required."),
            check('title').not().isEmpty().withMessage("Title is required").isString().withMessage('Title must be sting').trim(),
        ],
        checkForUnexpectedFields(["documents", "worker_id", "title"]),
        validation
    ];
}
exports.workerActiveDeactive = () => {
    return [
        [
            check("worker_id").notEmpty().withMessage("Worker ID is required."),
        ],
        checkForUnexpectedFields(["worker_id"]),
        validation
    ];
}


// JobCategory
exports.addJobCategory = () => {
    return [
        [
            check('category_name').not().isEmpty().withMessage("Category Name is required")
                .isString().withMessage('Category Name must be sting').trim(),
            check('Job_title').not().isEmpty().withMessage("Job title is required")
                .isString().withMessage('Job title must be sting').trim(),
        ],
        checkForUnexpectedFields(["category_name", "Job_title"]),
        validation
    ];
}
exports.JobCategoryDetail = () => {
    return [
        [
            check("category_id").notEmpty().withMessage("Category ID is required."),
        ],
        checkForUnexpectedFields(["category_id"]),
        validation
    ];
}
exports.getJobCategoryList = () => {
    return [
        [
            check('page').notEmpty().withMessage('Page must required.').isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
            check("search").optional().isString().withMessage("Search must be a string.").trim(),
            check("filter").notEmpty().withMessage('filter is required.').isString().withMessage("filter must be a string")
                .isIn(['id_ASC', 'id_DESC', 'category_name_ASC', 'category_name_DESC', 'Job_title_ASC', 'Job_title_DESC'])
                .withMessage("Invalid value for filter. Allowed values are: id_ASC, id_DESC, category_name_ASC, category_name_DESC, Job_title_ASC, Job_title_DESC").trim()
        ],
        checkForUnexpectedFields(["page", "limit", "search", "filter"]),
        validation
    ];
}

exports.editJobCategory = () => {
    return [
        [
            check("category_id").notEmpty().withMessage("Category ID is required."),
            check("job_title_id").notEmpty().withMessage("Job title ID is required."),
            check('category_name').optional().isString().withMessage('Category Name must be sting').trim(),
            check('Job_title').optional().isString().withMessage('Job title must be sting').trim(),
        ],
        checkForUnexpectedFields(["category_id", "job_title_id", "category_name", "Job_title"]),
        validation
    ];
}
exports.deleteJobCategory = () => {
    return [
        [
            check("job_title_id").notEmpty().withMessage("Job title ID is required."),
        ],
        checkForUnexpectedFields(["job_title_id"]),
        validation
    ];
}


// Client
exports.addClient = () => {
    return [
        [
            check('company_name').not().isEmpty().withMessage("company Name is required")
                .isString().withMessage('Company Name must be sting').trim(),
            check('client_name').not().isEmpty().withMessage("Client name is required")
                .isString().withMessage('Client name must be sting').trim(),
            check("email").not().isEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),
            check('phone_number').not().isEmpty().withMessage("phone_number is required"),
            check('iso_code').not().isEmpty().withMessage("ISO Code is required").trim().escape(),
            check('country_code').not().isEmpty().withMessage("Country Code is required").trim().escape(),
            check("address").notEmpty().withMessage("address is required."),
        ],
        checkForUnexpectedFields(["company_name", "client_name", "email", "phone_number", "iso_code", "country_code", "address"]),
        validation
    ];
}

exports.editClient = () => {
    return [
        [
            check("client_id").notEmpty().withMessage("Client ID is required."),
            check('company_name').optional().isString().withMessage('Company name Name must be sting').trim(),
            check('client_name').optional().isString().withMessage('Client name must be sting').trim(),
            check("email").optional().isEmail().withMessage("Invalid email format"),
            check('phone_number').optional(),
            check('iso_code').optional().trim().escape(),
            check('country_code').optional().trim().escape(),
            check("address").optional().isString().withMessage('Address must be sting').trim(),
        ],
        checkForUnexpectedFields(["client_id", "company_name", "client_name", "email", "phone_number", "iso_code", "country_code", "address"]),
        validation
    ];
}

exports.getClientDetail = () => {
    return [
        [
            check("client_id").notEmpty().withMessage("Client ID is required."),
        ],
        checkForUnexpectedFields(["client_id"]),
        validation
    ];
}

exports.clientList = () => {
    return [
        [
            check('page')
                .notEmpty()
                .withMessage('Page must required.')
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer.'),
            check("search").optional().isString().withMessage("search must be string").trim(),
            check("filter").notEmpty().withMessage('filter is required.').isString().withMessage("filter must be a string")
                .isIn(['id_ASC', 'id_DESC', 'company_name_ASC', 'company_name_DESC', 'client_name_ASC', 'client_name_DESC', 'email_ASC', 'email_DESC'])
                .withMessage("Invalid value for filter. Allowed values are: id_ASC, id_DESC, company_name_ASC, company_name_DESC, client_name_ASC, client_name_DESC, email_ASC, email_DESC").trim()
        ],
        checkForUnexpectedFields(["page", "limit", "search", "filter"]),
        validation
    ];
}



// Project
exports.addProject = () => {
    return [
        [
            check("documents").custom((value, { req }) => {
                if (!req.files || !req.files.documents) {
                    throw new Error('Documents is required');
                }
                return true;
            }),
            check("client_id").notEmpty().withMessage("Client ID is required."),
            check('project_name').not().isEmpty().withMessage("Project Name is required")
                .isString().withMessage('Project Name must be sting').trim(),
            check("start_date").notEmpty().withMessage('Start Date is required.').isISO8601().withMessage("Start Date must be a valid date (YYYY-MM-DD)."),
            check("end_date").notEmpty().withMessage('End Date is required.').isISO8601().withMessage("End Date must be a valid date (YYYY-MM-DD)."),
            check("address").notEmpty().withMessage("address is required.").isString().withMessage('Address must be sting').trim(),
            check("latitude").notEmpty().withMessage("Latitude is required.").isFloat({ min: -90, max: 90 }).withMessage("Latitude must be a valid coordinate."),
            check("longitude").notEmpty().withMessage("Longitude is required.").isFloat({ min: -180, max: 180 }).withMessage("Longitude must be a valid coordinate."),
        ],
        checkForUnexpectedFields(["documents", "client_id", "project_name", "start_date", "end_date", "address", "latitude", "longitude"]),
        validation
    ];
}

exports.editProject = () => {
    return [
        [
            check("project_id").notEmpty().withMessage("Project ID is required."),
            check("client_id").optional().isInt().withMessage("Client ID must be integer."),
            check('project_name').optional().isString().withMessage('Project Name must be sting').trim(),
            check("start_date").optional().isISO8601().withMessage("Start Date must be a valid date (YYYY-MM-DD)."),
            check("end_date").optional().isISO8601().withMessage("End Date must be a valid date (YYYY-MM-DD)."),
            check("address").optional().isString().withMessage('Address must be sting').trim(),
            check("status").optional().isIn(['active', 'deactive', 'completed', 'cancelled']).withMessage("Invalid value for status. Allowed values are 'active' or 'deactive' or 'completed' or 'cancelled' ").trim(),
            check("latitude").optional().isFloat({ min: -90, max: 90 }).withMessage("Latitude must be a valid coordinate."),
            check("longitude").optional().isFloat({ min: -180, max: 180 }).withMessage("Longitude must be a valid coordinate."),
        ],
        checkForUnexpectedFields(["project_id", "client_id", "project_name", "start_date", "end_date", "address", "status", "latitude", "longitude"]),
        validation
    ];
}

exports.projectDetail = () => {
    return [
        [
            check("project_id").notEmpty().withMessage("Project ID is required."),
        ],
        checkForUnexpectedFields(["project_id"]),
        validation
    ];
}

exports.getProjectList = () => {
    return [
        [
            check('page')
                .notEmpty()
                .withMessage('Page must required.')
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer.'),
            check("search").optional().isString().withMessage("search must be string").trim(),
            check("status").optional().isIn(['active', 'deactive', 'completed', 'cancelled']).withMessage('Invalid value for user_role. Allowed values are: "active", "deactive", "completed", "cancelled".'),
            check("filter").notEmpty().withMessage('filter is required.').isString().withMessage("filter must be a string")
                .isIn([
                    'id_ASC', 'id_DESC',
                    'project_name_DESC', 'project_name_ASC',
                    'client_name_ASC', 'client_name_DESC',
                    'start_date_ASC', 'start_date_DESC',
                    'end_date_ASC', 'end_date_DESC'
                ]).withMessage("Invalid value for filter. Allowed values are: id_ASC, id_DESC, project_name_DESC, project_name_ASC, client_name_ASC, client_name_DESC, start_date_ASC, start_date_DESC, end_date_ASC, end_date_DESC").trim()
        ],
        checkForUnexpectedFields(["page", "limit", "search", "status", "filter"]),
        validation
    ];
}

exports.projectDocumentList = () => {
    return [
        [
            check("project_id").notEmpty().withMessage("Project ID is required."),
            check('page')
                .notEmpty()
                .withMessage('Page must required.')
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer.'),
            check("search").optional().isString().withMessage("search must be string").trim(),
        ],
        checkForUnexpectedFields(["project_id", "page", "limit", "search", "filter"]),
        validation
    ];
}

exports.addProjectDocuments = () => {
    return [
        [
            check("documents").custom((value, { req }) => {
                if (!req.files || !req.files.documents) {
                    throw new Error('documents is required');
                }
                return true;
            }),
            check("project_id").notEmpty().withMessage("Project ID is required."),
            check('title').not().isEmpty().withMessage("Title is required").isString().withMessage('Title must be sting').trim(),
        ],
        checkForUnexpectedFields(["documents", "project_id", "title"]),
        validation
    ];
}

exports.deleteDocument = () => {
    return [
        [
            check("document_id").notEmpty().withMessage("Document ID is required."),
        ],
        checkForUnexpectedFields(["document_id"]),
        validation
    ];
}


// Company Holiday Validation
exports.addCompanyHoliday = () => {
    return [
        [
            check('holiday_name').notEmpty().withMessage('Holiday name is required').isString().withMessage('Holiday name must be a string'),
            check("date").notEmpty().withMessage('Date is required.').isISO8601().withMessage("Date must be a valid date (YYYY-MM-DD)."),
            check('day').notEmpty().withMessage('Day is required').isString().withMessage('Day must be a string'),
        ],
        checkForUnexpectedFields(["holiday_name", "date", "day"]),
        validation
    ];
}
exports.getCompanyHolidaysList = () => {
    return [
        [
            check('page')
                .notEmpty()
                .withMessage('Page must required.')
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer.'),
            check("filter").notEmpty().withMessage('filter is required.').isString().withMessage("filter must be string")
                .isIn(['id_ASC', 'id_DESC', 'holiday_name_ASC', 'date_ASC', 'day_ASC', 'holiday_name_DESC', 'date_DESC', 'day_DESC'])
                .withMessage("Invalid value for filter. Allowed values are id_ASC, id_DESC,   holiday_name_ASC, date_ASC, day_ASC, holiday_name_DESC, date_DESC, day_DESC.").trim()
        ],
        checkForUnexpectedFields(["page", "limit", "filter"]),
        validation
    ];
}
exports.editCompanyHoliday = () => {
    return [
        [
            check("holiday_id").notEmpty().withMessage("Holiday ID is required."),
            check('holiday_name').optional().isString().withMessage('Holiday name must be a string'),
            check("date").optional().isISO8601().withMessage("Date must be a valid date (YYYY-MM-DD)."),
            check('day').optional().isString().withMessage('Day must be a string'),
        ],
        checkForUnexpectedFields(["holiday_id", "holiday_name", "date", "day"]),
        validation
    ];
}
exports.deleteCompanyHoliday = () => {
    return [
        [
            check("holiday_id").notEmpty().withMessage("Holiday ID is required."),
        ],
        checkForUnexpectedFields(["holiday_id"]),
        validation
    ];
}

exports.editWorkerProfile = () => {
    return [
        [
            check("worker_id").notEmpty().withMessage("Worker ID is required."),
            check("profile_image").custom((value, { req }) => {
                if (req.files.profile_image.length > 1) {
                    req.files.profile_image.forEach(element => {
                        fs.unlinkSync(element.path);
                    });
                    throw new Error('Maximum 1 images allowed');
                }
                return true;
            }).optional(),
            check("job_category_id").optional().isInt().withMessage("Job Category ID must be integer."),
            check("job_title_id").optional().isInt().withMessage("Job ttitle ID must be integer."),
            check('firstname').optional().isString().withMessage('First Name must be sting').trim(),
            check('lastname').optional().isString().withMessage('Last Name must be sting').trim(),
            check('password').optional().isString().withMessage('Password must be sting').trim(),
            check('phone_number').optional().isString().withMessage('Phone number must be string').trim(),
            check('iso_code').optional().isString().withMessage("ISO Code must be string").trim(),
            check('country_code').optional().isString().withMessage("Country Code must be string").trim(),
            check("email").optional().isString().withMessage('Email must be string').isEmail().withMessage("Invalid email format"),
            check("address").optional().isString().withMessage("address must be string.").trim(),
            check("insurance_number").optional().isString().withMessage('Insurance Number must be sting').trim(),
            check("employment_date").optional().isISO8601().withMessage("Employment Date must be a valid date (YYYY-MM-DD)."),
            check("vacation_days").optional().isInt().withMessage('Vacation day must number').trim(),
            check("experience").optional().isString().withMessage('Experience must be sting').trim(),
        ],
        checkForUnexpectedFields(["worker_id", "profile_image", "job_category_id", "job_title_id", "firstname", "lastname", "password", "phone_number", "iso_code", "country_code", "email", "address", "insurance_number", "employment_date", "vacation_days", "experience"]),
        validation
    ];
}

exports.getWorkerMonthlyHours = () => {
    return [
        [
            check("worker_id").notEmpty().withMessage("Worker ID is required."),
            check('year').notEmpty().withMessage('Year is required').isInt().withMessage('Year must be a positive integer'),
        ],
        checkForUnexpectedFields(["worker_id", "year"]),
        validation
    ];
}

exports.getWorkerTimeTable = () => {
    return [
        [
            check("worker_id").notEmpty().withMessage("Worker ID is required."),
            check('page').notEmpty().withMessage('Page must required.').isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
            check('year').notEmpty().withMessage('Year is required').isInt().withMessage('Year must be a positive integer'),
            check('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be a positive integer between 1 and 12'),
        ],
        checkForUnexpectedFields(["worker_id", "year", "month", "page", "limit"]),
        validation
    ];
}



exports.getTimetableDetail = () => {
    return [
        [
            check("clock_entry_id").notEmpty().withMessage("Clock entry_id ID is required."),
        ],
        checkForUnexpectedFields(["clock_entry_id"]),
        validation
    ];
}

exports.editTimetableStatus = () => {
    return [
        [
            check("clock_entry_id").notEmpty().withMessage("Clock entry_id ID is required."),
            check("status").isIn(['approved', 'rejected']).withMessage('Invalid value for status. Allowed values are: "approved", "rejected".'),
        ],
        checkForUnexpectedFields(["clock_entry_id", "status"]),
        validation
    ];
}

exports.getCompanyMonthlyHours = () => {
    return [
        [
            check('year').notEmpty().withMessage('Year is required').isInt().withMessage('Year must be a positive integer'),
        ],
        checkForUnexpectedFields(["worker_id", "year"]),
        validation
    ];
}

exports.getWeeklyHours = () => {
    return [
        [
            check('year').notEmpty().withMessage('Year is required').isInt().withMessage('Year must be a positive integer'),
            check('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be a positive integer between 1 and 12'),
        ],
        checkForUnexpectedFields(["year", "month"]),
        validation
    ];
}


exports.dashboardRequestList = () => {
    return [
        [
            check('page')
                .notEmpty()
                .withMessage('Page must required.')
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer.'),
            check("filter").notEmpty().withMessage('filter is required.').isString().withMessage("filter must be string")
                .isIn(['id_ASC', 'id_DESC', 'worker_name_ASC', 'worker_name_DESC', 'date_ASC', 'date_DESC', 'absence_type_ASC', 'absence_type_DESC', 'paid_ASC', 'paid_DESC', 'unpaid_ASC', 'unpaid_DESC'])
                .withMessage("Invalid value for filter. Allowed values are id_ASC,id_DESC  worker_name_ASC, worker_name_DESC date_ASC, date_DESC, absence_type_ASC, absence_type_ASC, 'paid_ASC', 'paid_DESC', 'unpaid_ASC', 'unpaid_DESC'.").trim()
        ],
        checkForUnexpectedFields(["page", "limit", "filter"]),
        validation
    ];
}


exports.allAbsenceRequestList = () => {
    return [
        [
            check('page').notEmpty().withMessage('Page must required.').isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
            check('year').notEmpty().withMessage('Year is required').isInt().withMessage('Year must be a positive integer'),
            check('month').notEmpty().withMessage('Month is required').isInt({ min: 1, max: 12 }).withMessage('Month must be a positive integer between 1 and 12'),
            check("status").optional().isIn(['accepted', 'rejected']).withMessage('Invalid value for status. Allowed values are: pending, accepted, rejected.'),
            check("search").optional().isString().withMessage("search must be string").trim(),
            check("filter").notEmpty().withMessage('filter is required.').isString().withMessage("filter must be string")
                .isIn(['id_ASC', 'id_DESC', 'worker_name_ASC', 'worker_name_DESC', 'absence_type_ASC', 'absence_type_DESC', 'date_ASC', 'date_DESC',])
                .withMessage("Invalid value for filter. Allowed values are id_ASC, id_DESC, worker_name_ASC, worker_name_DESC, absence_type_ASC, absence_type_DESC, date_ASC, date_DESC.").trim()
        ],
        checkForUnexpectedFields(["page", "limit", "year", "month", "status", "search", "filter"]),
        validation
    ];
}

exports.absenceRequestDetail = () => {
    return [
        [
            check("absence_request_id").notEmpty().withMessage("Absence request ID is required."),
        ],
        checkForUnexpectedFields(["absence_request_id"]),
        validation
    ];
}

exports.approveRejectAbsenceRequest = () => {
    return [
        [
            check("absence_request_id").notEmpty().withMessage("Absence request ID is required."),
            check("status").notEmpty().withMessage("Status is required.").isIn(['accepted', 'rejected']).withMessage('Invalid value for status. Allowed values are: "accepted", "rejected".'),
        ],
        checkForUnexpectedFields(["absence_request_id", "status"]),
        validation
    ];
}

exports.upcomingHolidayList = () => {
    return [
        [
            check('year').notEmpty().withMessage('Year is required').isInt().withMessage('Year must be a positive integer'),
            check('month').notEmpty().withMessage('Month is required').isInt({ min: 1, max: 12 }).withMessage('Month must be a positive integer between 1 and 12'),
        ],
        checkForUnexpectedFields(["year", "month"]),
        validation
    ];
}

exports.getTimeTableList = () => {
    return [
        [
            check('page')
                .notEmpty()
                .withMessage('Page must required.')
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer.'),
            check("search").optional().isString().withMessage("search must be string").trim(),
            check('year').notEmpty().withMessage('Year is required').isInt().withMessage('Year must be a positive integer'),
            check('month').notEmpty().withMessage('Month is required').isInt({ min: 1, max: 12 }).withMessage('Month must be a positive integer between 1 and 12'),

        ],
        checkForUnexpectedFields(["page", "limit", "search", "year", "month"]),
        validation
    ];
}
