const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth');
const { uploadImage, cloudinary } = require('../utils/cloudinary');
const Media = require('../models/Media');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images, documents, audio, and video files
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|mp3|mp4|webm|wav|avi|mov|m4a|ogg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /image|pdf|document|text|audio|video|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, audio, and video files allowed.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// @route   POST /api/upload/image
// @desc    Upload image to Cloudinary
// @access  Private
router.post('/image', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload to Cloudinary
    const result = await uploadImage(req.file.path, 'whatele-chat/images');

    // Delete local file after upload
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      originalUrl: result.originalUrl,
      publicId: result.publicId,
      format: result.format,
      width: result.width,
      height: result.height,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    // Clean up file if upload failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// @route   POST /api/upload/file
// @desc    Upload file to Cloudinary
// @access  Private
router.post('/file', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    // Upload to Cloudinary
    const result = await uploadImage(req.file.path, 'whatele-chat/files');

    // Delete local file after upload
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      originalUrl: result.originalUrl,
      publicId: result.publicId,
      format: result.format,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    // Clean up file if upload failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// @route   POST /api/upload/media
// @desc    Upload media and create media record
// @access  Private
router.post('/media', protect, upload.single('media'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No media file provided'
      });
    }

    const { chatId, messageId } = req.body;

    if (!chatId) {
      // Clean up file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    // Determine media type
    const isImage = /image/.test(req.file.mimetype);
    const mediaType = isImage ? 'image' : 'file';

    // Upload to Cloudinary using appropriate method
    const folder = isImage ? 'whatele-chat/images' : 'whatele-chat/files';
    let result;
    
    if (isImage) {
      result = await uploadImage(req.file.path, folder);
    } else {
      const { uploadFile } = require('../utils/cloudinary');
      result = await uploadFile(req.file.path, folder);
    }

    // Delete local file after upload
    fs.unlinkSync(req.file.path);

    // Create media record (message ID will be set when the message is actually sent)
    const media = await Media.create({
      chat: chatId,
      sender: req.user._id,
      // Don't include message ID here - it will be linked later when message is sent
      mediaType,
      originalUrl: result.originalUrl,
      compressedUrl: isImage ? result.originalUrl : null, // Cloudinary auto-optimizes
      publicId: result.publicId,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    res.status(201).json({
      success: true,
      media,
      cloudinary: {
        publicId: result.publicId,
        format: result.format,
        url: result.originalUrl
      }
    });
  } catch (error) {
    // Clean up file if upload failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});



// @route   GET /api/upload/download
// @desc    Proxy file download from Cloudinary
// @access  Private
router.get('/download', protect, async (req, res) => {
  try {
    const { publicId } = req.query;
    
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'publicId is required' });
    }
    
    const axios = require('axios');
    
    console.log('🔍 Debug: Starting download process for publicId:', publicId);
    
    // Check config (Masked)
    const mask = (str) => str ? `${str.substring(0, 4)}...${str.substring(str.length - 4)}` : 'Missing';
    console.log('🔍 Debug: Cloudinary Config Check:', { 
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing', 
      apiKey: mask(process.env.CLOUDINARY_API_KEY),
      apiSecret: mask(process.env.CLOUDINARY_API_SECRET)
    });

    // 1. Try to find the media in DB to get the correct version
    const media = await Media.findOne({ publicId });
    let version = null;
    let resourceType = 'image';

    if (media) {
      console.log('✅ Debug: Found Media in DB:', media._id);
      // Extract version from originalUrl
      // Example: https://res.cloudinary.com/.../upload/v1733413061/...
      const versionMatch = media.originalUrl.match(/\/v(\d+)\//);
      if (versionMatch) {
        version = versionMatch[1];
        console.log('✅ Debug: Extracted version from DB:', version);
      }
      
      // Determine resource type from DB
      resourceType = media.mediaType === 'file' ? 'raw' : 'image';
    } else {
      console.warn('⚠️ Debug: Media not found in DB, falling back to heuristic');
      const isRawFile = publicId.includes('/files/');
      resourceType = isRawFile ? 'raw' : 'image';
    }

    console.log('🔍 Debug: Resource Type:', resourceType);
    
    // Generate URL using Cloudinary SDK
    // We use sign_url: true to ensure access even if strict security settings are enabled
    const urlOptions = {
      resource_type: resourceType,
      secure: true,
      sign_url: true
    };

    if (version) {
      urlOptions.version = version;
    }

    const fileUrl = cloudinary.url(publicId, urlOptions);
    
    console.log('🔗 Debug: Generated Cloudinary URL:', fileUrl);
    
    // Stream the file from Cloudinary to client
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream',
      timeout: 30000
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${publicId.split('/').pop()}"`);
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    
    response.data.pipe(res);
  } catch (error) {
    console.error('❌ Debug: Download Error Details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data
    });
    
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Download failed',
        debug: {
          error: error.message,
          status: error.response?.status
        }
      });
    }
  }
});

module.exports = router;
