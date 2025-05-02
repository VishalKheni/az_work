const multer = require('multer');
const fs = require('fs')
const db = require("../config/db");

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      let folder = '';
      if (file.fieldname === 'profile_image') folder = 'profile_images';
      else if (file.fieldname === 'documents') folder = 'documents';
      else if (file.fieldname === 'company_logo') folder = 'company_logo';
      else if (file.fieldname === 'absence_logo') folder = 'absence_logo';
      else return cb(new Error('Invalid file fieldname'), false);
      const uploadPath = `./public/${folder}`;
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  })
});

const validateAndSendOTPToMail = async (email) => {
  const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();
  const otp = generateOTP();

  // Check if an OTP record already exists
  const existingOTP = await db.Otp.findOne({
    where: { email }
  });

  if (existingOTP) {
    // Update the existing OTP record
    await db.Otp.update(
      { otp },
      {
        where: { email }
      }
    );
  } else {
    // Create a new OTP record
    await db.Otp.create({
      email,
      otp,
    });
  }

  try {
    return { status: 1, message: "OTP sent to your email",  otp };
  } catch (error) {
    return {
      status: 0,
      message: "Failed to send OTP. Please try again later.",
      error: error.message
    };
  }
};

module.exports = { upload, validateAndSendOTPToMail }; 