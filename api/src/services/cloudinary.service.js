const cloudinary = require('cloudinary').v2;
const config = require('../config/index');

// Configure Cloudinary — reads from env variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Check if Cloudinary is properly configured.
 */
function isCloudinaryEnabled() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'shopizi',
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }, // Auto-serve WebP to compatible browsers
        ],
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary by its public_id.
 * @param {string} publicId - The public_id returned by Cloudinary on upload
 */
async function deleteAsset(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('[Cloudinary] Failed to delete asset:', publicId, err.message);
  }
}

/**
 * Build a resized, optimized URL from a Cloudinary public_id.
 * @param {string} publicId
 * @param {Object} transforms - width, height, crop, etc.
 */
function buildUrl(publicId, transforms = {}) {
  return cloudinary.url(publicId, {
    secure: true,
    quality: 'auto',
    fetch_format: 'auto',
    ...transforms,
  });
}

module.exports = { cloudinary, isCloudinaryEnabled, uploadBuffer, deleteAsset, buildUrl };
