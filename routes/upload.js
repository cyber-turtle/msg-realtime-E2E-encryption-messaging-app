const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const axios = require('axios');
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
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|mp3|mp4|webm|wav|avi|mov|m4a|ogg|enc/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /image|pdf|document|text|audio|video|octet-stream|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/.test(file.mimetype);

  if (extname || mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
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
// @desc    Upload encrypted image to Cloudinary
// @access  Private
router.post('/image', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const { encryptionKey } = req.body;
    let uploadPath = req.file.path;
    let encryptionData = null;

    // Encrypt image if encryption key provided (E2E security)
    if (encryptionKey) {
      const { encryptFile } = require('../utils/mediaEncryption');
      const encrypted = await encryptFile(req.file.path, encryptionKey);
      uploadPath = encrypted.encryptedPath;
      encryptionData = {
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        encrypted: true
      };
    }

    // Upload to Cloudinary
    const result = await uploadImage(uploadPath, 'whatele-chat/images');

    // Delete local files after upload
    fs.unlinkSync(req.file.path);
    if (encryptionData && fs.existsSync(uploadPath)) {
      fs.unlinkSync(uploadPath);
    }

    res.json({
      success: true,
      originalUrl: result.originalUrl,
      publicId: result.publicId,
      format: result.format,
      width: result.width,
      height: result.height,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      encryptionData: encryptionData
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
// @desc    Upload encrypted media and create media record
// @access  Private
router.post('/media', protect, upload.single('media'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No media file provided'
      });
    }

    const { chatId, messageId, encryptionKey } = req.body;

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

    let uploadPath = req.file.path;
    let encryptionData = null;

    // Check if file is already encrypted (Client-Side E2E)
    const isEncryptedClientSide = req.file.originalname.endsWith('.enc');
    
    if (isEncryptedClientSide) {
        uploadPath = req.file.path;
        encryptionData = {
            encrypted: true,
            clientSide: true
        };
    } else {
        const crypto = require('crypto');
        const finalEncryptionKey = encryptionKey || crypto.randomBytes(32).toString('hex');
        
        const { encryptFile } = require('../utils/mediaEncryption');
        const encrypted = await encryptFile(req.file.path, finalEncryptionKey);
        uploadPath = encrypted.encryptedPath;
        encryptionData = {
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          encrypted: true,
          serverSide: true
        };
    }

    // Upload to Cloudinary - encrypted files must use 'raw' resource type
    const folder = isEncryptedClientSide ? 'whatele-chat/encrypted' : 
                   (isImage ? 'whatele-chat/images' : 'whatele-chat/files');
    let result;
    
    if (isEncryptedClientSide) {
      const { uploadFile } = require('../utils/cloudinary');
      result = await uploadFile(uploadPath, folder);
    } else if (isImage) {
      result = await uploadImage(uploadPath, folder);
    } else {
      const { uploadFile } = require('../utils/cloudinary');
      result = await uploadFile(uploadPath, folder);
    }

    // Delete local files after upload
    fs.unlinkSync(req.file.path);
    if (encryptionData?.serverSide && fs.existsSync(uploadPath)) {
      fs.unlinkSync(uploadPath);
    }

    // Create media record with encryption metadata
    const media = await Media.create({
      chat: chatId,
      sender: req.user._id,
      mediaType,
      originalUrl: result.originalUrl,
      compressedUrl: (isImage && !isEncryptedClientSide) ? result.originalUrl : null,
      publicId: result.publicId,
      fileName: req.file.originalname.replace(/\.enc$/, ''),
      fileSize: req.file.size,
      encryptionData: encryptionData
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
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (encryptionData?.serverSide && uploadPath && fs.existsSync(uploadPath)) {
      fs.unlinkSync(uploadPath);
    }
    next(error);
  }
});

// @route   GET /api/upload/download
// @desc    Secure file download with access control
// @access  Private
router.get('/download', protect, async (req, res) => {
  try {
    const { publicId } = req.query;
    
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'publicId is required' });
    }
    
    console.log('🔍 Debug: Starting download process for publicId:', publicId);
    
    // Check config (Masked)
    const mask = (str) => str ? `${str.substring(0, 4)}...${str.substring(str.length - 4)}` : 'Missing';
    console.log('🔍 Debug: Cloudinary Config Check:', { 
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing', 
      apiKey: mask(process.env.CLOUDINARY_API_KEY),
      apiSecret: mask(process.env.CLOUDINARY_API_SECRET)
    });

    // 1. Find media and verify user has access
    const media = await Media.findOne({ publicId }).populate('chat');
    
    if (!media) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    // 2. Check if user has access to this chat/file
    const hasAccess = media.chat.participants.includes(req.user._id) || 
                     media.sender.toString() === req.user._id.toString();
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
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