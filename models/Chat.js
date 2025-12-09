const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  isGroupChat: {
    type: Boolean,
    default: false
  },
  chatName: {
    type: String,
    trim: true,
    default: null
  },
  chatAvatar: {
    type: String,
    default: null
  },
  // E2E Encryption for Group Names
  encryptedChatName: {
    type: String,
    default: null
  },
  // Map of userId -> encrypted group key (AES key encrypted with user's RSA public key)
  encryptedKeys: {
    type: Map,
    of: String,
    default: null
  },
  // IV for the chat name encryption
  iv: {
    type: String,
    default: null
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  latestMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  }
}, {
  timestamps: true
});

// Validate participant count before saving
chatSchema.pre('save', async function () {
  if (this.isGroupChat && this.participants.length > 50) {
    throw new Error('Group chats cannot have more than 50 participants');
  }
  if (!this.isGroupChat && this.participants.length !== 2) {
    throw new Error('Private chats must have exactly 2 participants');
  }
});

// Index for fast chat lookup by participants
chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);
