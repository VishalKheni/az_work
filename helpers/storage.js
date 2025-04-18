const multer = require('multer');
const fs = require('fs')

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      let folder = '';
      if (file.fieldname === 'profile_image') folder = 'profile_images';
      else if (file.fieldname === 'documents') folder = 'documents';
      else if (file.fieldname === 'company_logo') folder = 'company_logo';
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

module.exports = { upload };