const { check, validationResult } = require("express-validator");
const { verifyToken } = require('../middleware/verifyToken');
const fs = require("fs");
const moment = require("moment");

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

// Company Validation
exports.companyList = () => {
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
                .withMessage("Invalid value for user_role. Allowed values are active or inactive or blocked "),
            check("branch_name").optional().isString().withMessage("Branch name must be string").trim(),
            check("filter").notEmpty().withMessage('filter is required.').isString().withMessage("filter must be string")
                .isIn(['name_ASC', 'name_DESC', 'email_ASC', 'email_DESC', 'branch_ASC', 'branch_DESC', 'id_ASC', 'id_DESC']).withMessage("Invalid value for user_role. Allowed values are name_ASC,name_DESC, email_ASC, email_DESC, branch_ASC, branch_DESC, id_ASC, id_DESC").trim()
        ],
        checkForUnexpectedFields(["page", "limit", "search", "status", "branch_name", "filter"]),
        validation
    ];
}
exports.companyDetail = () => {
    return [
        [
            check("company_id").notEmpty().withMessage("Company ID is required."),
        ],
        checkForUnexpectedFields(["company_id"]),
        validation
    ];
}
exports.companyowner = () => {
    return [
        [
            check("owner_id").notEmpty().withMessage("Owner ID is required."),
        ],
        checkForUnexpectedFields(["owner_id"]),
        validation
    ];
}

exports.changeCompanyPassword = () => {
    return [
        [
            check("owner_id").notEmpty().withMessage("Owner ID is required."),
            check("newPassword").not().isEmpty().withMessage("New Password is required").trim().escape(),
        ],
        checkForUnexpectedFields(["owner_id", "newPassword"]),
        validation
    ];
}


// Branch Validation
exports.addBranch = () => {
    return [
        [
            check('branch_name')
                .notEmpty().withMessage('Branch name is required')
                .isString().withMessage('Branch name must be a string'),
            check('weekly_hours')
                .notEmpty().withMessage('Weekly hours is required')
                .isNumeric().withMessage('Weekly hours must be a number'),
            check('monthly_hours')
                .notEmpty().withMessage('Monthly hours is required')
                .isNumeric().withMessage('Monthly hours must be a number'),
            check('yearly_hours')
                .notEmpty().withMessage('Yearly hours is required')
                .isNumeric().withMessage('Yearly hours must be a number'),
        ],
        checkForUnexpectedFields(["branch_name", "weekly_hours", "monthly_hours", "yearly_hours"]),
        validation
    ];
}

exports.allBranchList = () => {
    return [
        [
            check('page')
                .notEmpty()
                .withMessage('Page must required.')
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer.'),
            check("filter").notEmpty().withMessage('filter is required.').isString().withMessage("filter must be string")
                .isIn(['branch_ASC', 'branch_DESC', 'id_ASC', 'id_DESC', 'weekly_hours_ASC', 'weekly_hours_DESC', 'monthly_hours_ASC', 'monthly_hours_DESC', 'yearly_hours_ASC', 'yearly_hours_DESC'])
                .withMessage("Invalid value for filter. Allowed values are  branch_ASC,branch_DESC, id_ASC,id_DESC, weekly_hours_ASC, weekly_hours_DESC ,monthly_hours_ASC,monthly_hours_DESC, yearly_hours_ASC, yearly_hours_DESC").trim()
        ],
        checkForUnexpectedFields(["page", "limit", "filter"]),
        validation
    ];
}
exports.editBranch = () => {
    return [
        [
            check("branch_id").notEmpty().withMessage("Branch ID is required."),
            check('branch_name').optional().isString().withMessage('Branch name must be a string'),
            check('weekly_hours').optional().isNumeric().withMessage('Weekly hours must be a number'),
            check('monthly_hours').optional().isNumeric().withMessage('Monthly hours must be a number'),
            check('yearly_hours').optional().isNumeric().withMessage('Yearly hours must be a number'),
        ],
        checkForUnexpectedFields(["branch_id", "branch_name", "weekly_hours", "monthly_hours", "yearly_hours"]),
        validation
    ];
}
exports.deleteBranch = () => {
    return [
        [
            check("branch_id").notEmpty().withMessage("Branch ID is required."),
        ],
        checkForUnexpectedFields(["branch_id"]),
        validation
    ];
}

// Holiday Validation
exports.addHoliday = () => {
    return [
        [
            check('holiday_name').notEmpty().withMessage('Holiday name is required').isString().withMessage('Holiday name must be a string'),
            check("date").notEmpty().withMessage('Date is required.').isISO8601().withMessage("Date must be a valid date (YYYY-MM-DD)."),
            check('day').notEmpty().withMessage('Day is required').isString().withMessage('Day must be a string'),
            // check("date")
            //     .notEmpty().withMessage("Date is required.")
            //     .custom(value => {
            //         if (!moment(value, "MM-DD-YYYY", true).isValid()) {
            //             throw new Error("Date must be in MM-DD-YYYY format.");
            //         }
            //         return true;
            //     })
        ],
        checkForUnexpectedFields(["holiday_name", "date", "day"]),
        validation
    ];
}
exports.getHolidaysList = () => {
    return [
        [
            check('page')
                .notEmpty()
                .withMessage('Page must required.')
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer.'),
            check("filter").notEmpty().withMessage('filter is required.').isString().withMessage("filter must be string")
                .isIn(['holiday_name_ASC', 'date_ASC', 'day_ASC', 'holiday_name_DESC', 'date_DESC', 'day_DESC'])
                .withMessage("Invalid value for filter. Allowed values are  holiday_name_ASC, date_ASC, day_ASC, 'holiday_name_DESC', 'date_DESC', 'day_DESC'.").trim()
        ],
        checkForUnexpectedFields(["page", "limit", "filter"]),
        validation
    ];
}
exports.editHoliday = () => {
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
exports.deleteHoliday = () => {
    return [
        [
            check("holiday_id").notEmpty().withMessage("Holiday ID is required."),
        ],
        checkForUnexpectedFields(["holiday_id"]),
        validation
    ];
}


// Absences Validation
exports.addAbsences = () => {
    return [
        [
            check("absence_logo").custom((value, { req }) => {
                if (!req.files || !req.files.absence_logo) {
                    throw new Error('absence logo is required');
                }
                if (req.files.absence_logo.length > 1) {
                    req.files.absence_logo.forEach(element => {
                        fs.unlinkSync(element.path);
                    });
                    throw new Error('Maximum 1 images allowed');
                }
                return true;
            }),
            check('absence_type').notEmpty().withMessage('Absences type name is required').isString().withMessage('Absences type must be a string'),
            check("status").not().isEmpty().withMessage("Status is required").trim().escape()
                .isIn(["paid", "unpaid"]).withMessage("Invalid value for status. Allowed values are 'paid' or 'unpaid' "),
        ],
        checkForUnexpectedFields(["absence_type", "status", "absence_logo"]),
        validation
    ];
}
exports.editAbsences = () => {
    return [
        [
            check("absence_logo").custom((value, { req }) => {
                if (req.files && req.files.absence_logo && req.files.absence_logo.length > 1) {
                    req.files.absence_logo.forEach(element => {
                        fs.unlinkSync(element.path);
                    });
                    throw new Error('Maximum 1 image allowed');
                }
                return true;
            }).optional(),
            check("absence_id").notEmpty().withMessage("Absence ID is required."),
            check('absence_type').optional().isString().withMessage('Absences type must be a string'),
            check("status").optional().isIn(["paid", "unpaid"]).withMessage("Invalid value for user_role. Allowed values are 'paid' or 'unpaid' "),
        ],
        checkForUnexpectedFields(["absence_id", "absence_type", "status", "absence_logo"]),
        validation
    ];
}
exports.deleteAbsences = () => {
    return [
        [
            check("absence_id").notEmpty().withMessage("Absence ID is required."),
        ],
        checkForUnexpectedFields(["absence_id"]),
        validation
    ];
}
exports.getAbsencesList = () => {
    return [
        [
            check('page')
                .notEmpty()
                .withMessage('Page must required.')
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer.'),
            check("filter").notEmpty().withMessage('filter is required.').isString().withMessage("filter must be string")
                .isIn(['id_DESC', 'absence_type_ASC', 'paid_ASC', 'unpaid_ASC', 'absence_type_DESC', 'paid_DESC', 'unpaid_DESC'])
                .withMessage("Invalid value for filter. Allowed values are id_DESC,  absence_type_ASC, paid_ASC, unpaid_ASC, absence_type_DESC, paid_DESC, unpaid_DESC.").trim()
        ],
        checkForUnexpectedFields(["page", "limit", "filter"]),
        validation
    ];
}
