import { Router } from 'express';
import { upload } from '../middlewares/upload.js';
import { uploadPlatform, uploadBank } from '../controllers/uploadController.js';

const router = Router();

router.post('/platform', upload.single('file'), uploadPlatform);
router.post('/bank', upload.single('file'), uploadBank);

export default router;
