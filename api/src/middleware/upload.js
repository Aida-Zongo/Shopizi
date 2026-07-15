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

/**
 * Produits digitaux : le fichier vendu (pdf, zip, audio, vidéo...) et sa
 * couverture (image). Types et taille diffèrent des uploads images, d'où un
 * filtre et une limite dédiés.
 *
 * La limite reste très en deçà des 500 Mo demandés : memoryStorage garde le
 * fichier entier en RAM et Render (plan free) ne dispose que de 512 Mo — un
 * upload de 500 Mo ferait tomber le process en OOM. Réglable via
 * DIGITAL_MAX_FILE_SIZE_MB si l'instance grossit.
 */
const DIGITAL_MAX_FILE_SIZE = (parseInt(process.env.DIGITAL_MAX_FILE_SIZE_MB, 10) || 100) * 1024 * 1024;

const DIGITAL_ALLOWED_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/epub+zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg',
  'audio/mp3',
  'video/mp4',
  'image/jpeg',
  'image/png',
  'image/gif',
];

function digitalFileFilter(req, file, cb) {
  // La couverture est une image d'illustration : mêmes règles que les autres images.
  const allowed = file.fieldname === 'cover' ? ALLOWED_TYPES : DIGITAL_ALLOWED_TYPES;
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new UnprocessableEntityError(
        `Type de fichier non supporté : ${file.mimetype}. Types acceptés : ${allowed.join(', ')}`
      ),
      false
    );
  }
}

const digitalUpload = multer({
  storage: memoryStorage,
  fileFilter: digitalFileFilter,
  limits: { fileSize: DIGITAL_MAX_FILE_SIZE, files: 2 },
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

module.exports = { productImageUpload, shopImageUpload, singleUpload, digitalUpload, DIGITAL_MAX_FILE_SIZE };