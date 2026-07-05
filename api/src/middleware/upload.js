const multer = require('multer');
const { UnprocessableEntityError } = require('../utils/errors');
const config = require('../config/index');

// File size limit in bytes
const MAX_FILE_SIZE = config.upload.maxFileSizeMb * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = config.upload.allowedMimeTypes;

// Use memory storage — file goes straight to Cloudinary, no local disk needed
const memoryStorage = multer.memoryStorage();

// File filter
function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new UnprocessableEntityError(
        `Type de fichier non autorisé : ${file.mimetype}. Types acceptés : ${ALLOWED_TYPES.join(', ')}`
      ),
      false
    );
  }
}

/**
 * Multer instance for product image uploads (up to 5 files).
 * Files are kept in memory for Cloudinary upload.
 */
const productImageUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
}).array('images', 5);

/**
 * Multer instance for shop logo/banner (single file).
 */
const shopImageUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

/**
 * Multer instance for single generic upload.
 */
const singleUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
}).single('file');

module.exports = { productImageUpload, shopImageUpload, singleUpload };