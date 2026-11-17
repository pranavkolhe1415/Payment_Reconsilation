import multer from 'multer';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds maximum allowed limit (15MB)'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`
    });
  }

  if (err.message && err.message.includes('Only .csv files are supported')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error Handler] ${req.method} ${req.path} -> ${statusCode}: ${message}`);

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
