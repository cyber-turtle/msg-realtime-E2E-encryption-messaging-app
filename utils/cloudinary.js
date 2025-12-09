const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Path to the image file
 * @param {string} folder - Folder name in Cloudinary (default: 'whatele-chat')
 * @returns {Promise<Object>} - Upload result with URLs
 */
const uploadImage = async (filePath, folder = 'whatele-chat') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    return {
      originalUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    if (error.http_code === 499 || error.name === 'TimeoutError') {
      throw new Error('Upload timed out. Please check your internet connection and try again.');
    }
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Upload raw files (PDFs, documents, etc.) to Cloudinary
 */
const uploadFile = async (filePath, folder = 'whatele-chat') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'raw',
      type: 'upload',
      access_mode: 'public',
      use_filename: true,
      unique_filename: true
    });

    return {
      originalUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary file upload error:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<Object>} - Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadFile,
  deleteImage
};
