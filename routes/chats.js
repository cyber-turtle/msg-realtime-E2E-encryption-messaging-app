const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// @route   POST /api/chats
// @desc    Create or get existing private chat
// @access  Private
router.post('/', protect, [
  body('userId').notEmpty().withMessage('User ID is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { userId } = req.body;

    // Check if user exists and is verified
    const otherUser = await User.findById(userId);
    if (!otherUser || !otherUser.isEmailVerified) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cannot chat with yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself'
      });
    }

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      isGroupChat: false,
      participants: { $all: [req.user._id, userId] }
    })
    .populate('participants', 'username email avatar profilePicture bio online lastSeen publicKey about')
    .populate('latestMessage');

    if (existingChat) {
      return res.json({
        success: true,
        chat: existingChat,
        isNew: false
      });
    }

    // Create new private chat
    const chat = await Chat.create({
      isGroupChat: false,
      participants: [req.user._id, userId]
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username email avatar profilePicture bio online lastSeen publicKey about');

    res.status(201).json({
      success: true,
      chat: populatedChat,
      isNew: true
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/chats/group
// @desc    Create group chat
// @access  Private
router.post('/group', protect, [
  body('chatName').trim().notEmpty().withMessage('Group name is required'),
  body('participants').isArray({ min: 2 }).withMessage('At least 2 participants required (excluding yourself)')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { chatName, participants, chatAvatar } = req.body;

    // Validate participant limit (49 + current user = 50)
    if (participants.length > 49) {
      return res.status(400).json({
        success: false,
        message: 'Group chats cannot exceed 50 participants'
      });
    }

    // Verify all participants exist and are verified
    const users = await User.find({
      _id: { $in: participants },
      isEmailVerified: true
    });

    if (users.length !== participants.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants not found or not verified'
      });
    }

    // Add current user to participants if not already included
    const allParticipants = [...new Set([req.user._id.toString(), ...participants])];

    // Create group chat
    const chat = await Chat.create({
      isGroupChat: true,
      chatName,
      chatAvatar: chatAvatar || null,
      participants: allParticipants,
      admins: [req.user._id] // Creator is admin
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username email avatar profilePicture bio online lastSeen publicKey about')
      .populate('admins', 'username email avatar');

    res.status(201).json({
      success: true,
      chat: populatedChat
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/chats
// @desc    Get all user's chats
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    // Find chats where user is a current participant
    const participantChats = await Chat.find({
      participants: req.user._id
    })
    .populate('participants', 'username email avatar profilePicture bio online lastSeen publicKey about')
    .populate('admins', 'username email avatar')
    .populate({
      path: 'latestMessage',
      populate: {
        path: 'sender',
        select: 'username avatar'
      }
    })
    .sort({ updatedAt: -1 });

    // Find chats where user has messages but is no longer a participant (removed from group)
    const messagesWithChats = await Message.find({
      sender: req.user._id,
      deletedForAll: false,
      deletedFor: { $ne: req.user._id }
    }).distinct('chat');

    // Get those chats where user is NOT a participant
    const removedFromChats = await Chat.find({
      _id: { $in: messagesWithChats },
      participants: { $ne: req.user._id },
      isGroupChat: true // Only group chats can have this scenario
    })
    .populate('participants', 'username email avatar profilePicture bio online lastSeen publicKey about')
    .populate('admins', 'username email avatar')
    .populate({
      path: 'latestMessage',
      populate: {
        path: 'sender',
        select: 'username avatar'
      }
    });

    // Combine both lists and remove duplicates
    const allChatsMap = new Map();
    [...participantChats, ...removedFromChats].forEach(chat => {
      allChatsMap.set(chat._id.toString(), chat);
    });

    const allChats = Array.from(allChatsMap.values())
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Calculate unread counts for each chat
    const chatsWithUnread = await Promise.all(allChats.map(async (chat) => {
      // Build unread query
      let unreadQuery = {
        chat: chat._id,
        sender: { $ne: req.user._id }, // Not sent by current user
        seenBy: { $ne: req.user._id }, // Not seen by current user
        deletedForAll: false,
        deletedFor: { $ne: req.user._id }
      };

      // For group chats, check if user was removed and re-added (need to exclude gap period)
      if (chat.isGroupChat) {
        // Check if user is currently a participant
        const isParticipant = chat.participants.some(p => p._id.toString() === req.user._id.toString());
        
        // Find the LATEST removal message for this user
        const removalMessage = await Message.findOne({
          chat: chat._id,
          type: 'system',
          action: 'remove',
          targetUser: req.user._id
        }).sort({ createdAt: -1 });

        if (removalMessage) {
          if (isParticipant) {
            // User was removed and re-added - check for re-add message AFTER the removal
            const reAddMessage = await Message.findOne({
              chat: chat._id,
              type: 'system',
              action: 'add',
              targetUser: req.user._id,
              createdAt: { $gt: removalMessage.createdAt }
            }).sort({ createdAt: -1 });

            if (reAddMessage) {
              // Only count messages BEFORE removal OR AFTER re-add
              unreadQuery.$or = [
                { createdAt: { $lt: removalMessage.createdAt } },
                { createdAt: { $gte: reAddMessage.createdAt } }
              ];
            }
          } else {
            // User was removed and NOT re-added - only count messages before removal
            unreadQuery.createdAt = { $lt: removalMessage.createdAt };
          }
        }
      }

      const unreadCount = await Message.countDocuments(unreadQuery);

      return {
        ...chat.toObject(),
        unreadCount
      };
    }));

    res.json({
      success: true,
      count: chatsWithUnread.length,
      chats: chatsWithUnread
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/chats/:chatId
// @desc    Get chat details
// @access  Private
router.get('/:chatId', protect, async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('participants', 'username email avatar profilePicture bio online lastSeen publicKey about')
      .populate('admins', 'username email avatar');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify user is a participant
    const isParticipant = chat.participants.some(
      participant => participant._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/chats/:chatId/group
// @desc    Update group info
// @access  Private
router.put('/:chatId/group', protect, [
  body('chatName').optional().trim().notEmpty()
], async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }

    // Check if user is admin
    const isAdmin = chat.admins.some(
      admin => admin.toString() === req.user._id.toString()
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update group info'
      });
    }

    const { chatName, chatAvatar } = req.body;

    if (chatName) chat.chatName = chatName;
    if (chatAvatar !== undefined) chat.chatAvatar = chatAvatar;

    await chat.save();

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username email avatar profilePicture bio online lastSeen publicKey about')
      .populate('admins', 'username email avatar');

    // Emit socket event to all group members
    const io = req.app.get('io');
    if (io) {
      io.to(chat._id.toString()).emit('group_updated', populatedChat);
    }

    res.json({
      success: true,
      chat: populatedChat
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/chats/:chatId/participants
// @desc    Add participant to group
// @access  Private
router.post('/:chatId/participants', protect, [
  body('userId').notEmpty().withMessage('User ID is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { userId } = req.body;

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }

    // Check if user is admin
    const isAdmin = chat.admins.some(
      admin => admin.toString() === req.user._id.toString()
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can add participants'
      });
    }

    // Check if user exists and is verified
    const userToAdd = await User.findById(userId);
    if (!userToAdd || !userToAdd.isEmailVerified) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already a participant
    if (chat.participants.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a participant'
      });
    }

    // Check 50-member limit
    if (chat.participants.length >= 50) {
      return res.status(400).json({
        success: false,
        message: 'Group has reached maximum capacity of 50 members'
      });
    }

    chat.participants.push(userId);
    await chat.save();

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username email avatar profilePicture bio online lastSeen publicKey about')
      .populate('admins', 'username email avatar');

    // Create system message for the group
    const addMessage = await Message.create({
      chat: chat._id,
      sender: req.user._id,
      content: 'System Message',
      type: 'system',
      messageType: 'system',
      action: 'add',
      targetUser: userId,
      initiator: req.user._id
    });

    const populatedAddMessage = await Message.findById(addMessage._id)
      .populate('sender', 'username email avatar profilePicture')
      .populate('targetUser', 'username email avatar profilePicture')
      .populate('initiator', 'username email avatar profilePicture')
      .populate('chat');

    // Emit socket events
    const io = req.app.get('io');
    
    // Make the added user join the chat room
    io.sockets.sockets.forEach(socket => {
      if (socket.userId === userId) {
        socket.join(chat._id.toString());
      }
    });
    
    // Notify all members about group update and new message
    io.to(chat._id.toString()).emit('group_updated', populatedChat);
    io.to(chat._id.toString()).emit('receive_message', populatedAddMessage.toObject());
    
    // Notify added user about new chat in their list
    io.sockets.sockets.forEach(socket => {
      if (socket.userId === userId) {
        socket.emit('new_chat', populatedChat);
      }
    });

    res.json({
      success: true,
      chat: populatedChat
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/chats/:chatId/participants/:userId
// @desc    Remove participant from group
// @access  Private
router.delete('/:chatId/participants/:userId', protect, async (req, res, next) => {
  try {
    const { chatId, userId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }

    // Check if user is admin
    const isAdmin = chat.admins.some(
      admin => admin.toString() === req.user._id.toString()
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove participants'
      });
    }

    // Cannot remove yourself (use leave endpoint)
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Use leave endpoint to exit the group'
      });
    }

    // Remove participant
    chat.participants = chat.participants.filter(
      p => p.toString() !== userId
    );

    // Remove from admins if they were admin
    chat.admins = chat.admins.filter(
      a => a.toString() !== userId
    );

    await chat.save();

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username email avatar profilePicture bio online lastSeen publicKey about')
      .populate('admins', 'username email avatar');

    // Create system message for the group
    const removeMessage = await Message.create({
      chat: chat._id,
      sender: req.user._id,
      content: 'System Message',
      type: 'system',
      messageType: 'system',
      action: 'remove',
      targetUser: userId,
      initiator: req.user._id
    });

    const populatedRemoveMessage = await Message.findById(removeMessage._id)
      .populate('sender', 'username email avatar profilePicture')
      .populate('targetUser', 'username email avatar profilePicture')
      .populate('initiator', 'username email avatar profilePicture')
      .populate('chat');

    // Emit socket events
    const io = req.app.get('io');
    
    // Notify the removed user before removing them from the room
    io.sockets.sockets.forEach(socket => {
      if (socket.userId === userId) {
        socket.emit('receive_message', populatedRemoveMessage.toObject());
        socket.emit('group_removal_notification', { chatId: chat._id.toString() });
        socket.emit('group_updated', populatedChat);
      }
    });

    // Make the removed user leave the chat room
    io.sockets.sockets.forEach(socket => {
      if (socket.userId === userId) {
        socket.leave(chat._id.toString());
      }
    });
    
    // Notify remaining members
    io.to(chat._id.toString()).emit('group_updated', populatedChat);
    io.to(chat._id.toString()).emit('receive_message', populatedRemoveMessage.toObject());

    res.json({
      success: true,
      chat: populatedChat
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/chats/:chatId/leave
// @desc    Leave group chat
// @access  Private
router.delete('/:chatId/leave', protect, async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave a private chat'
      });
    }

    // Remove user from participants
    chat.participants = chat.participants.filter(
      p => p.toString() !== req.user._id.toString()
    );

    // Remove from admins if admin
    chat.admins = chat.admins.filter(
      a => a.toString() !== req.user._id.toString()
    );

    // If no participants left, delete chat
    if (chat.participants.length === 0) {
      await Chat.findByIdAndDelete(chat._id);
      return res.json({
        success: true,
        message: 'Group deleted (no participants remaining)'
      });
    }

    // If no admins left, make first participant admin
    if (chat.admins.length === 0 && chat.participants.length > 0) {
      chat.admins.push(chat.participants[0]);
    }

    // Create system message for leave
    const leaveMessage = await Message.create({
      chat: chat._id,
      sender: req.user._id,
      content: 'System Message',
      type: 'system',
      messageType: 'system',
      action: 'leave',
      targetUser: req.user._id,
      initiator: req.user._id
    });

    const populatedLeaveMessage = await Message.findById(leaveMessage._id)
      .populate('sender', 'username email avatar profilePicture')
      .populate('targetUser', 'username email avatar profilePicture')
      .populate('initiator', 'username email avatar profilePicture')
      .populate('chat');

    // Notify remaining members
    const io = req.app.get('io');
    io.to(chat._id.toString()).emit('group_updated', chat);
    io.to(chat._id.toString()).emit('receive_message', populatedLeaveMessage.toObject());

    await chat.save();

    res.json({
      success: true,
      message: 'Successfully left the group'
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/chats/:chatId
// @desc    Delete chat
// @access  Private
router.delete('/:chatId', protect, async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify user is a participant
    const isParticipant = chat.participants.some(
      p => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // For group chats, only admins can delete
    if (chat.isGroupChat) {
      const isAdmin = chat.admins.some(
        admin => admin.toString() === req.user._id.toString()
      );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can delete group chats'
        });
      }
    }

    // Delete all messages in the chat
    await Message.deleteMany({ chat: chat._id });

    // Delete the chat
    await Chat.findByIdAndDelete(chat._id);

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
