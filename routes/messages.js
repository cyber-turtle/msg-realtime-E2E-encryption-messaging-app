const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const Media = require('../models/Media');
const { protect } = require('../middleware/auth');

// @route   POST /api/messages
// @desc    Send message (encrypted)
// @access  Private
router.post('/', protect, [
  body('chatId').notEmpty().withMessage('Chat ID is required'),
  body('messageType').isIn(['text', 'image', 'file', 'audio']).withMessage('Invalid message type'),
  body('encryptedContent').optional().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { chatId, messageType, encryptedContent, iv, encryptedKeys, mediaUrl, type, media } = req.body;

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const isParticipant = chat.participants.some(
      p => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat'
      });
    }

    // Create message
    const message = await Message.create({
      chat: chatId,
      sender: req.user._id,
      messageType,
      encryptedContent,
      iv,
      encryptedKeys: encryptedKeys || null,
      mediaUrl: mediaUrl || null,
      type: type || messageType || 'text',
      media: media || null,
      status: 'sent'
    });

    // Update chat's latest message
    chat.latestMessage = message._id;
    chat.updatedAt = new Date();
    await chat.save();

    // Populate sender info
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar');

    // Get socket.io instance and emit to chat room
    const io = req.app.get('io');
    if (io) {
      // Check if any recipients are online and mark as delivered
      const sockets = await io.fetchSockets();
      const onlineParticipants = chat.participants.filter(participantId => {
        if (participantId.toString() === req.user._id.toString()) return false;
        return sockets.some(s => s.userId === participantId.toString());
      });

      if (onlineParticipants.length > 0) {
        // Mark as delivered for online users
        message.deliveredTo = onlineParticipants.map(p => p.toString());
        message.status = 'delivered';
        await message.save();
        
        // Update populated message with new status
        populatedMessage.deliveredTo = message.deliveredTo;
        populatedMessage.status = message.status;
      }

      // Convert to plain object (schema transform will handle Map conversion)
      const messageToEmit = populatedMessage.toObject();
      
      // Emit message to all participants in chat
      io.to(chatId).emit('receive_message', messageToEmit);

      // If this is the first message in chat, notify other participants about new chat
      const messageCount = await Message.countDocuments({ chat: chatId });
      if (messageCount === 1) {
        const populatedChat = await Chat.findById(chatId)
          .populate('participants', 'username email avatar bio online lastSeen publicKey')
          .populate({
            path: 'latestMessage',
            populate: { path: 'sender', select: 'username avatar' }
          });
        
        // Emit to each participant except sender
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== req.user._id.toString()) {
            const targetSocket = sockets.find(s => s.userId === participantId.toString());
            if (targetSocket) {
              targetSocket.emit('new_chat', populatedChat.toObject());
            }
          }
        });
      }
    }

    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/messages/:chatId
// @desc    Get chat messages (paginated)
// @access  Private
router.get('/:chatId', protect, async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify chat exists
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is a current participant
    const isParticipant = chat.participants.some(
      p => p.toString() === req.user._id.toString()
    );

    // If not a participant, check if they have message history (were removed from group)
    if (!isParticipant) {
      const hasMessageHistory = await Message.exists({
        chat: chatId,
        sender: req.user._id
      });

      if (!hasMessageHistory) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Build query for messages
    let messageQuery = {
      chat: chatId,
      deletedForAll: false,
      deletedFor: { $ne: req.user._id }
    };

    // Check if user was previously removed and re-added (applies to both participants and non-participants)
    if (chat.isGroupChat) {
      // Find the most recent removal message for this user
      const removalMessage = await Message.findOne({
        chat: chatId,
        type: 'system',
        messageType: 'system',
        content: { $regex: `removed.*${req.user.username}|${req.user.username}.*removed`, $options: 'i' }
      }).sort({ createdAt: -1 });

      if (removalMessage) {
        // Check if user is currently a participant (was re-added)
        if (isParticipant) {
          // User was removed and re-added
          // Find the most recent "added" message after the removal
          const reAddMessage = await Message.findOne({
            chat: chatId,
            type: 'system',
            messageType: 'system',
            content: { $regex: `added.*${req.user.username}|${req.user.username}.*added|${req.user.username}.*joined`, $options: 'i' },
            createdAt: { $gt: removalMessage.createdAt }
          }).sort({ createdAt: -1 });

          if (reAddMessage) {
            // Show messages BEFORE removal OR AFTER re-add (exclude the gap period)
            messageQuery.$or = [
              { createdAt: { $lt: removalMessage.createdAt } },
              { createdAt: { $gte: reAddMessage.createdAt } }
            ];
          } else {
            // No re-add message found, but user is participant
            // This might be their first time in group, show all messages
          }
        } else {
          // User was removed and NOT re-added
          // Only show messages created BEFORE the removal timestamp
          messageQuery.createdAt = { $lt: removalMessage.createdAt };
        }
      }
    }

    // Get messages (exclude messages deleted for this user or deleted for all)
    const messages = await Message.find(messageQuery)
    .populate('sender', 'username avatar')
    .populate('targetUser', 'username avatar')
    .populate('initiator', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    const total = await Message.countDocuments(messageQuery);

    // Convert to plain objects to ensure Map fields are serialized
    const serializedMessages = messages.map(msg => msg.toObject());

    res.json({
      success: true,
      messages: serializedMessages.reverse(), // Return in ascending order (oldest first)
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/messages/:messageId/status
// @desc    Update message status (delivered/seen)
// @access  Private
router.put('/:messageId/status', protect, [
  body('status').isIn(['delivered', 'seen']).withMessage('Invalid status')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status } = req.body;

    const message = await Message.findById(req.params.messageId)
      .populate('chat');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user is participant
    const isParticipant = message.chat.participants.some(
      p => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update status only if current status is lower
    const statusHierarchy = { sent: 0, delivered: 1, seen: 2 };
    if (statusHierarchy[status] > statusHierarchy[message.status]) {
      message.status = status;
      await message.save();

      // Emit status update via socket
      const io = req.app.get('io');
      if (io) {
        io.to(message.chat._id.toString()).emit('message_status_update', {
          messageId: message._id,
          status: message.status
        });
      }
    }

    res.json({
      success: true,
      message
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete message
// @access  Private
router.delete('/:messageId', protect, async (req, res, next) => {
  try {
    const { forAll } = req.query;

    const message = await Message.findById(req.params.messageId)
      .populate('chat');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user is participant
    const isParticipant = message.chat.participants.some(
      p => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (forAll === 'true') {
      // Delete for all - only sender can do this within 1 hour
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only sender can delete message for everyone'
        });
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (message.createdAt < oneHourAgo) {
        return res.status(400).json({
          success: false,
          message: 'Can only delete for everyone within 1 hour of sending'
        });
      }

      message.deletedForAll = true;
      message.encryptedContent = null;
      message.content = 'This message was deleted';
      await message.save();

      // Emit deletion event
      const io = req.app.get('io');
      if (io) {
        io.to(message.chat._id.toString()).emit('message_deleted', {
          messageId: message._id,
          deletedForAll: true
        });
      }

      return res.json({
        success: true,
        message: 'Message deleted for everyone'
      });
    } else {
      // Delete for me
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
        await message.save();
      }

      return res.json({
        success: true,
        message: 'Message deleted for you'
      });
    }
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/messages/:messageId/forward
// @desc    Forward message to another chat
// @access  Private
router.post('/:messageId/forward', protect, [
  body('chatId').notEmpty().withMessage('Destination chat ID is required'),
  body('encryptedContent').notEmpty().withMessage('Encrypted content is required'),
  body('iv').notEmpty().withMessage('IV is required'),
  body('encryptedKeys').notEmpty().withMessage('Encrypted keys are required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { chatId, encryptedContent, iv, encryptedKeys, type, mediaUrl } = req.body;

    // Get original message
    const originalMessage = await Message.findById(req.params.messageId).lean();

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify destination chat exists and user is participant
    const destinationChat = await Chat.findById(chatId);

    if (!destinationChat) {
      return res.status(404).json({
        success: false,
        message: 'Destination chat not found'
      });
    }

    const isParticipant = destinationChat.participants.some(
      p => p._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in the destination chat'
      });
    }

    // Create forwarded message with encrypted data
    const messageData = {
      chat: chatId,
      sender: req.user._id,
      messageType: originalMessage.messageType || type || 'text',
      type: originalMessage.type || type || 'text',
      encryptedContent,
      iv,
      encryptedKeys,
      mediaUrl: originalMessage.mediaUrl || mediaUrl,
      forwardedFrom: originalMessage._id,
      status: 'sent'
    };

    // Only include media if it exists and is not null (and has properties)
    if (originalMessage.media && originalMessage.media !== null && Object.keys(originalMessage.media).length > 0) {
      messageData.media = originalMessage.media;
    }

    const forwardedMessage = await Message.create(messageData);

    // Update chat's latest message
    destinationChat.latestMessage = forwardedMessage._id;
    destinationChat.updatedAt = new Date();
    await destinationChat.save();

    const populatedMessage = await Message.findById(forwardedMessage._id)
      .populate('sender', 'username avatar');

    // Emit to chat room for real-time delivery
    const io = req.app.get('io');
    if (io) {
      // Convert to plain object (schema transform will handle Map conversion)
      const messageToEmit = populatedMessage.toObject();
      io.to(chatId).emit('receive_message', messageToEmit);
    }

    // Convert to plain object for response as well
    res.status(201).json({
      success: true,
      message: populatedMessage.toObject()
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/messages/:chatId/media
// @desc    Get shared media in chat
// @access  Private
router.get('/:chatId/media', protect, async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { type } = req.query; // 'image' or 'file'

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const isParticipant = chat.participants.some(
      p => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Build query
    const query = { chat: chatId };
    if (type) {
      query.mediaType = type;
    }

    const media = await Media.find(query)
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: media.length,
      media
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
