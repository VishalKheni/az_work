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



exports.addclockEntrry = () => {
    return [
        [
            check("project_id")
                .notEmpty().withMessage("Project ID is required.")
                .isInt().withMessage("Project ID must be an integer."),
            check("address")
                .notEmpty().withMessage("Address is required.")
                .isString().withMessage("Address must be a string."),
            check("type")
                .notEmpty().withMessage("Type is required.")
                .isIn(["clock_in", "clock_out"]).withMessage("Type must be either 'clock_in' or 'clock_out'."),
            check("latitude")
                .notEmpty().withMessage("Latitude is required.")
                .isFloat({ min: -90, max: 90 }).withMessage("Latitude must be a valid coordinate."),
            check("longitude")
                .notEmpty().withMessage("Longitude is required.")
                .isFloat({ min: -180, max: 180 }).withMessage("Longitude must be a valid coordinate."),
        ],
        checkForUnexpectedFields(["project_id", "address", "type", "latitude", "longitude"]),
        validation
    ];
};
exports.getHistrory = () => {
    return [
        [
            // check("project_id")
            //     .notEmpty().withMessage("Project ID is required.")
            //     .isInt().withMessage("Project ID must be an integer."),
            check("start_date").optional().isISO8601().withMessage("Start Date must be a valid date (YYYY-MM-DD)."),
            check("end_date").optional().isISO8601().withMessage("End Date must be a valid date (YYYY-MM-DD)."),
            check('page').notEmpty().withMessage('Page must required.').isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
        ],
        checkForUnexpectedFields(["page", "limit", "start_date", "end_date", "project_id"]),
        validation
    ];
}

exports.addclockImgaes = () => {
    return [
        [
            check("clock_images").custom((value, { req }) => {
                if (!req.files || !req.files.clock_images) {
                    throw new Error('Clock images is required');
                }
                return true;
            }),
            check("project_id").notEmpty().withMessage("Project ID is required."),
            check("clock_entry_id").notEmpty().withMessage("Clock entry ID is required."),
        ],
        checkForUnexpectedFields(["clock_images", "project_id", "clock_entry_id"]),
        validation
    ];
}

exports.sendAbsencesRequest = () => {
    return [
        [
            check("absence_id").notEmpty().withMessage("Absence ID is required.").isInt().withMessage("Absence ID must be an integer."),
            check("reason").notEmpty().withMessage("Reason is required.").isString().withMessage("Reason must be a string."),
            check("type").notEmpty().withMessage("Type is required.").isIn([0, 1]).withMessage("Type must be 0 (single day) or 1 (multiple days)."),
            check("start_date").notEmpty().withMessage("Start Date is required.").isISO8601().withMessage("Start Date must be a valid date (YYYY-MM-DD)."),
            check("end_date").custom((value, { req }) => {
                if (req.body.type == 1) {
                    if (!value) {
                        throw new Error("End Date is required for multi-day absences.");
                    }

                    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        throw new Error("End Date must be in YYYY-MM-DD format.");
                    }

                    if (!Date.parse(value)) {
                        throw new Error("End Date must be a valid date.");
                    }

                    const start = new Date(req.body.start_date);
                    const end = new Date(value);

                    if (end < start) {
                        throw new Error("End Date cannot be before Start Date.");
                    }
                }
                return true;
            }),
        ],
        checkForUnexpectedFields(["worker_id", "absence_id", "type", "start_date", "end_date", "reason"]),
        validation
    ];
}

exports.pagination = () => {
    return [
        [
            check('page').notEmpty().withMessage('Page must required.').isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
        ],
        checkForUnexpectedFields(["page", "limit"]),
        validation
    ];
}

exports.homeScreenCount = () => {
    return [
        [
            check('year').optional().isInt().withMessage('Year must be a positive integer'),
            check('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be a positive integer between 1 and 12'),
        ],
        checkForUnexpectedFields(["year", "month"]),
        validation
    ];
}

exports.AbsenceScrenCalendar = () => {
    return [
        [
            check('year').notEmpty().withMessage('Year is required').isInt().withMessage('Year must be a positive integer'),
            check('month').notEmpty().withMessage('Month is required').isInt({ min: 1, max: 12 }).withMessage('Month must be a positive integer between 1 and 12'),
        ],
        checkForUnexpectedFields(["year", "month"]),
        validation
    ];
}

exports.deleteimage = () => {
    return [
        [
            check("image_id").notEmpty().withMessage("Image ID is required.").isInt().withMessage("Image ID must be an integer."),
        ],
        checkForUnexpectedFields(["image_id"]),
        validation
    ];
}

exports.AllProjectList = () => {
    return [
        [
            check('page')
                .notEmpty()
                .withMessage('Page must required.')
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer.'),
            check("search").optional().isString().withMessage("search must be string").trim(),
        ],
        checkForUnexpectedFields(["page", "limit", "search", "search"]),
        validation
    ];
}
exports.editClockEntry = () => {
    return [
        [
            check('clock_entry_id').notEmpty().withMessage('clock_entry_id is required').isInt().withMessage('clock_entry_id must be an integer'),
            check('clock_in_time').optional().isISO8601().withMessage('clock_in_time must be a valid ISO 8601 date'),
            check('clock_out_time').optional().isISO8601().withMessage('clock_out_time must be a valid ISO 8601 date'),
            check('reason').notEmpty().withMessage('reason is required').isString().withMessage('reason must be a string'),
        ],
        checkForUnexpectedFields(['clock_entry_id', 'clock_in_time', 'clock_out_time', 'reason']),
        validation
    ];
}

