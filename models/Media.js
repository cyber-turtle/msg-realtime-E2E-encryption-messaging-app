const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: false,
    default: null
  },
  mediaType: {
    type: String,
    enum: ['image', 'file'],
    required: true
  },
  originalUrl: {
    type: String,
    required: true
  },
  compressedUrl: {
    type: String,
    default: null
  },
  publicId: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  // E2E encryption metadata (IV and authTag, NOT the key)
  encryptionData: {
    iv: String,
    authTag: String,
    encrypted: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Index for fast media lookup by chat
mediaSchema.index({ chat: 1, createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema);
