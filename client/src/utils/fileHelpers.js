import Resizer from 'react-image-file-resizer';

/**
 * Compress image file before upload
 * @param {File} file - Image file to compress
 * @returns {Promise<File>} - Compressed image file
 */
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    try {
      Resizer.imageFileResizer(
        file,
        1920, // max width
        1920, // max height
        'JPEG', // format
        80, // quality (0-100)
        0, // rotation
        (compressedFile) => {
          resolve(compressedFile);
        },
        'file', // output type
        800, // min width
        800 // min height
      );
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Validate file type
 * @param {File} file - File to validate
 * @returns {boolean} - Whether file is valid
 */
export const isValidImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
};

/**
 * Validate file size (10MB limit)
 * @param {File} file - File to validate
 * @returns {boolean} - Whether file size is valid
 */
export const isValidFileSize = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  return file.size <= maxSize;
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Crop image based on pixel area
 * @param {string} imageSrc - Image source URL
 * @param {object} pixelCrop - Crop area in pixels { x, y, width, height }
 * @returns {Promise<Blob>} - Cropped image blob
 */
export const getCroppedImg = (imageSrc, pixelCrop) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        blob.name = 'cropped.jpg';
        resolve(blob);
      }, 'image/jpeg');
    };
    image.onerror = (error) => reject(error);
  });
};
