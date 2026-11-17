import multer from 'multer';
import path from 'path';

// Use memory storage to process CSVs directly as buffers
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.csv') {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type "${ext}". Only .csv files are supported.`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB limit
  }
});
