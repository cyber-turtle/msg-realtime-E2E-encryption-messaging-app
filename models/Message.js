const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
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
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'call', 'audio', 'system'],
    default: 'text'
  },
  // Plain content for system messages only
  content: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'call', 'audio'],
    default: 'text'
  },
  // System message metadata
  action: {
    type: String,
    enum: ['add', 'remove', 'leave', null],
    default: null
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Call data for call logs
  callData: {
    callType: {
      type: String,
      enum: ['voice', 'video']
    },
    duration: {
      type: Number, // in seconds
      default: 0
    },
    status: {
      type: String,
      enum: ['missed', 'declined', 'completed', 'no-answer'],
      default: 'completed'
    }
  },
  media: {
    url: String,
    publicId: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    thumbnail: String,
    iv: String // IV for media file decryption
  },
  // Encrypted content for user messages (E2E encryption)
  encryptedContent: {
    type: String,
    default: null
  },
  // For group chats: object mapping userId to encrypted symmetric key
  // E.g., { "userId1": "encryptedKey1", "userId2": "encryptedKey2" }
  encryptedKeys: {
    type: Map,
    of: String,
    default: null
  },
  // Initialization vector for encryption
  iv: {
    type: String,
    default: null
  },
  // Cloudinary URL for media (can also be encrypted)
  mediaUrl: {
    type: String,
    default: null
  },
  // Legacy status field (kept for backward compatibility)
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent'
  },
  // Array of user IDs who have received this message
  deliveredTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Array of user IDs who have seen this message
  seenBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Array of user IDs who deleted this message (delete for me)
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // If true, message deleted for everyone
  deletedForAll: {
    type: Boolean,
    default: false
  },
  // Reference to original message if forwarded
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Convert Map to plain object for JSON serialization
      if (ret.encryptedKeys && ret.encryptedKeys instanceof Map) {
        ret.encryptedKeys = Object.fromEntries(ret.encryptedKeys);
      }
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      // Convert Map to plain object when converting to object
      if (ret.encryptedKeys && ret.encryptedKeys instanceof Map) {
        ret.encryptedKeys = Object.fromEntries(ret.encryptedKeys);
      }
      return ret;
    }
  }
});

// Indexes for fast message retrieval
messageSchema.index({ chat: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
