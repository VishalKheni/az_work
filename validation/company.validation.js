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
        ],
        checkForUnexpectedFields(["profile_image", "documents", "job_category_id", "job_title_id", "firstname", "lastname", "phone_number", "iso_code", "country_code", "email", "address", "insurance_number", "employment_date", "password"]),
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
