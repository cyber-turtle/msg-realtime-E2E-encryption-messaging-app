const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/users/search
// @desc    Search users globally by username or email
// @access  Private
router.get('/search', protect, async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchTerm = q.trim();

    // Search for users by username or email (case-insensitive)
    // Only return verified users
    const users = await User.find({
      $and: [
        { isEmailVerified: true },
        { _id: { $ne: req.user._id } }, // Exclude current user
        {
          $or: [
            { username: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username email avatar bio online lastSeen')
    .limit(20);

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/:userId
// @desc    Get user by ID (public info only)
// @access  Private
router.get('/:userId', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username email avatar bio online lastSeen');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isEmailVerified) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/:userId/public-key
// @desc    Get user's public key for E2E encryption
// @access  Private
router.get('/:userId/public-key', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('publicKey');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      publicKey: user.publicKey
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, [
  body('username').optional().trim().isLength({ min: 3, max: 30 }),
  body('bio').optional().trim().isLength({ max: 150 }),
  body('about').optional().trim().isLength({ max: 150 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, bio, avatar, about, profilePicture } = req.body;

    // Check if username is already taken
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;
    if (about !== undefined) updateData.about = about;
    if (profilePicture) updateData.profilePicture = profilePicture;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    // Broadcast profile update via socket
    const io = req.app.get('io');
    if (io) {
      // Notify this user's socket to broadcast the update
      io.sockets.sockets.forEach(socket => {
        if (socket.userId === req.user._id.toString()) {
          socket.emit('trigger_profile_broadcast', {
            username: user.username,
            profilePicture: user.profilePicture,
            bio: user.bio,
            about: user.about
          });
        }
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/:userId/media
// @desc    Get shared media with a user
// @access  Private
router.get('/:userId/media', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const Chat = require('../models/Chat');
    const Message = require('../models/Message');

    // Find private chat between current user and target user
    const chat = await Chat.findOne({
      isGroupChat: false,
      participants: { $all: [req.user._id, userId] }
    });

    if (!chat) {
      return res.json({
        success: true,
        media: []
      });
    }

    // Get all messages with media from this chat
    const messages = await Message.find({
      chat: chat._id,
      type: { $in: ['image', 'file'] },
      'media.url': { $exists: true }
    })
    .select('media type createdAt')
    .sort({ createdAt: -1 })
    .limit(100);

    // Extract media objects
    const media = messages.map(msg => ({
      ...msg.media,
      type: msg.type,
      createdAt: msg.createdAt
    }));

    res.json({
      success: true,
      media
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
