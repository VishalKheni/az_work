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

exports.signUp = () => {
    return [
        [
            check('firstname').not().isEmpty().withMessage("First Name is required")
                .isString().withMessage('First Name must be sting').trim().escape(),
            check('lastname').not().isEmpty().withMessage("Last Name is required")
                .isString().withMessage('Last Name must be sting').trim().escape(),
            check('phone_number').not().isEmpty().withMessage("phone_number is required"),
            check('iso_code').not().isEmpty().withMessage("ISO Code is required").trim().escape(),
            check('country_code').not().isEmpty().withMessage("Country Code is required").trim().escape(),
            check("user_role").isIn(['company', 'worker']).withMessage('Invalid value for user_role. Allowed values are: "company", "worker".'),
        ],
        checkForUnexpectedFields(["firstname", "lastname", "phone_number", "iso_code", "country_code", "user_role"]),
        validation
    ];
}


exports.addCompany = () => {
    return [
        [
            check("company_logo").custom((value, { req }) => {
                if (!req.files || !req.files.company_logo) {
                    throw new Error('company logo is required');
                }
                if (req.files.company_logo.length > 1) {
                    req.files.company_logo.forEach(element => {
                        fs.unlinkSync(element.path);
                    });
                    throw new Error('Maximum 1 images allowed');
                }
                return true;
            }),
            check("user_id").notEmpty().withMessage("User ID is required."),
            check("industry_id").notEmpty().withMessage("Industry ID is required."),
            check('company_name').not().isEmpty().withMessage("Company Name is required").trim().escape(),
            check('phone_number').not().isEmpty().withMessage("phone_number is required"),
            check('iso_code').not().isEmpty().withMessage("ISO Code is required").trim().escape(),
            check('country_code').not().isEmpty().withMessage("Country Code is required").trim().escape(),
            check("address").notEmpty().withMessage("address is required."),
        ],
        checkForUnexpectedFields(["user_id", "industry_id", "company_logo", "company_name", "phone_number", "iso_code", "country_code", "address"]),
        validation
    ];
}

exports.createPassword = () => {
    return [
        [
            check("user_id").notEmpty().withMessage("User ID is required."),
            check("email").not().isEmpty().withMessage("Email is required").trim().escape(),
            check("password").not().isEmpty().withMessage("Password is required").trim().escape(),
        ],
        checkForUnexpectedFields(["user_id", "email", "password"]),
        validation
    ];
}

exports.sendOtpToEmail = () => {
    return [
        [
            check("email").not().isEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),
        ],
        checkForUnexpectedFields(["email"]),
        validation
    ];
}
exports.verifyOtpAndRegister = () => {
    return [
        [
            check("company_logo").custom((value, { req }) => {
                if (!req.files || !req.files.company_logo) {
                    throw new Error('company logo is required');
                }
                if (req.files.company_logo.length > 1) {
                    req.files.company_logo.forEach(element => {
                        fs.unlinkSync(element.path);
                    });
                    throw new Error('Maximum 1 images allowed');
                }
                return true;
            }),
            check('firstname').not().isEmpty().withMessage("First Name is required")
                .isString().withMessage('First Name must be sting').trim().escape(),
            check('lastname').not().isEmpty().withMessage("Last Name is required")
                .isString().withMessage('Last Name must be sting').trim().escape(),
            check('phone_number').not().isEmpty().withMessage("phone_number is required"),
            check('iso_code').not().isEmpty().withMessage("ISO Code is required").trim().escape(),
            check('country_code').not().isEmpty().withMessage("Country Code is required").trim().escape(),
            check("email").not().isEmpty().withMessage("Email is required").trim().escape(),
            check("password").not().isEmpty().withMessage("Password is required").trim().escape(),
            check("industry_id").notEmpty().withMessage("Industry ID is required."),
            check('company_name').not().isEmpty().withMessage("Company Name is required").trim().escape(),
            check('company_phone_number').not().isEmpty().withMessage("Company phone_number is required"),
            check('company_iso_code').not().isEmpty().withMessage("Company ISO Code is required").trim().escape(),
            check('company_country_code').not().isEmpty().withMessage("Company Country Code is required").trim().escape(),
            check("address").notEmpty().withMessage("address is required."),
            check("device_id").not().isEmpty().withMessage("Device ID is required").trim(),
            check("device_type").not().isEmpty().withMessage("Device type is required").trim(),
            check("device_token").not().isEmpty().withMessage("Device token is required").trim(),
        ],
        checkForUnexpectedFields(["company_logo", "firstname", "lastname", "phone_number", "iso_code", "country_code", "email", "password", "industry_id", "company_name", "company_phone_number", "company_iso_code", "company_country_code", "address", "otp", "device_id", "device_type", "device_token"]),
        validation
    ];
}

exports.verifyOtp = () => {
    return [
        [
            check("email").not().isEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),
            check("otp").not().isEmpty().withMessage("Otp is required").trim(),
            check("device_id").not().isEmpty().withMessage("Device ID is required").trim(),
            check("device_type").not().isEmpty().withMessage("Device type is required").trim(),
            check("device_token").not().isEmpty().withMessage("Device token is required").trim(),
        ],
        checkForUnexpectedFields(["email", "otp", "device_id", "device_type", "device_token"]),
        validation
    ];
}

exports.login = () => {
    return [
        [
            check("email").not().isEmpty().withMessage("Email is required").trim().escape(),
            check("password").not().isEmpty().withMessage("Password is required").trim().escape(),
            check("device_id").not().isEmpty().withMessage("Device ID is required").trim().escape(),
            check("device_type").not().isEmpty().withMessage("Device type is required").trim().escape(),
            check("device_token").not().isEmpty().withMessage("Device token is required").trim().escape(),
            check("user_role").isIn(['company', 'worker', 'admin']).withMessage('Invalid value for user_role. Allowed values are: "company", "worker", "admin.'),

        ],
        checkForUnexpectedFields(["user_role", "device_token", "device_type", "device_id", "email", "password"]),
        validation
    ];
}

exports.changePassword = () => {
    return [
        [
            check("oldPassword").not().isEmpty().withMessage("Old Password is required").trim().escape(),
            check("newPassword").not().isEmpty().withMessage("New Password is required").trim().escape(),
        ],
        checkForUnexpectedFields(["oldPassword", "newPassword"]),
        validation
    ];
}


exports.verifyOtpForResetPassword = () => {
    return [
        [
            check("email").not().isEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),
            check("otp").not().isEmpty().withMessage("Otp is required").trim(),
        ],
        checkForUnexpectedFields(["email", "otp"]),
        validation
    ];
}

exports.resetPassword = () => {
    return [
        [
            check("email").not().isEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),
            check("newpassword").not().isEmpty().withMessage("New Password is required").trim().escape(),
        ],
        checkForUnexpectedFields(["email", "newpassword"]),
        validation
    ];
}


exports.editProfile = () => {
    return [
        [
            check("profile_image").custom((value, { req }) => {
                if (req.files && req.files.profile_image && req.files.profile_image.length > 1) {
                    req.files.profile_image.forEach(element => {
                        fs.unlinkSync(element.path);
                    });
                    throw new Error('Maximum 1 image allowed');
                }
                return true;
            }),
            check('firstname').optional().isString().withMessage('First Name must be sting').trim().escape(),
            check('lastname').optional().isString().withMessage('Last Name must be sting').trim().escape(),
        ],
        checkForUnexpectedFields(["profile_image", "firstname", 'lastname']),
        validation
    ];
}
