const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// Store online users: { socketId: userId }
const onlineUsers = new Map();
// Store typing users: { chatId: Set(userIds) }
const typingUsers = new Map();

/**
 * Initialize Socket.io event handlers
 * @param {Server} io - Socket.io server instance
 */
const initializeSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (!user.isEmailVerified) {
        return next(new Error('Authentication error: Email not verified'));
      }

      // Attach user to socket
      socket.userId = user._id.toString();
      socket.user = user;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection event
  io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (${socket.id})`);

    // Store online user
    onlineUsers.set(socket.id, socket.userId);

    // Update user status to online
    await User.findByIdAndUpdate(socket.userId, {
      online: true,
      lastSeen: new Date()
    });

    // Get all user's chats
    const userChats = await Chat.find({
      participants: socket.userId
    }).select('_id');

    // Join all user's chat rooms
    userChats.forEach(chat => {
      socket.join(chat._id.toString());
    });

    // Broadcast online status to all user's chats
    userChats.forEach(chat => {
      socket.to(chat._id.toString()).emit('user_online', {
        userId: socket.userId,
        username: socket.user.username
      });
    });

    // Send list of online users in each chat
    socket.emit('online_users', Array.from(onlineUsers.values()));

    /**
     * Join a specific chat room
     */
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`📥 ${socket.user.username} joined chat: ${chatId}`);
    });

    /**
     * Leave a specific chat room
     */
    socket.on('leave_chat', (chatId) => {
      socket.leave(chatId);
      console.log(`📤 ${socket.user.username} left chat: ${chatId}`);
    });

    /**
     * Note: Message broadcasting is now handled directly in the API route
     * to avoid duplicate broadcasts and ensure proper message serialization
     */

    /**
     * Typing indicator
     */
    socket.on('typing', (chatId) => {
      if (!typingUsers.has(chatId)) {
        typingUsers.set(chatId, new Set());
      }
      
      typingUsers.get(chatId).add(socket.userId);

      // Broadcast to others in chat
      socket.to(chatId).emit('user_typing', {
        chatId,
        userId: socket.userId,
        username: socket.user.username
      });

      console.log(`⌨️ ${socket.user.username} is typing in ${chatId}`);
    });

    /**
     * Stop typing indicator
     */
    socket.on('stop_typing', (chatId) => {
      if (typingUsers.has(chatId)) {
        typingUsers.get(chatId).delete(socket.userId);
        
        // Clean up if no one is typing
        if (typingUsers.get(chatId).size === 0) {
          typingUsers.delete(chatId);
        }
      }

      // Broadcast to others in chat
      socket.to(chatId).emit('user_stop_typing', {
        chatId,
        userId: socket.userId,
        username: socket.user.username
      });
    });

    /**
     * Message delivered (recipient received the message)
     */
    socket.on('message_delivered', async ({ messageId, chatId }) => {
      try {
        // Update message in database
        const message = await Message.findById(messageId);
        if (message && !message.deliveredTo.includes(socket.userId)) {
          message.deliveredTo.push(socket.userId);

          // Update legacy status field
          if (message.status === 'sent') {
            message.status = 'delivered';
          }

          await message.save();

          // Broadcast to sender
          socket.to(chatId).emit('message_status_update', {
            messageId,
            status: message.status,
            deliveredTo: message.deliveredTo,
            seenBy: message.seenBy
          });
        }
      } catch (error) {
        console.error('Error updating message delivered status:', error);
      }
    });

    /**
     * Message seen (recipient viewed the message)
     */
    socket.on('message_seen', async ({ messageIds, chatId }) => {
      try {
        // Update messages in database
        const updatedMessages = [];

        for (const messageId of messageIds) {
          const message = await Message.findById(messageId);
          if (message) {
            // Add to deliveredTo if not already there
            if (!message.deliveredTo.includes(socket.userId)) {
              message.deliveredTo.push(socket.userId);
            }
            // Add to seenBy if not already there
            if (!message.seenBy.includes(socket.userId)) {
              message.seenBy.push(socket.userId);
            }

            // Update legacy status field
            message.status = 'seen';

            await message.save();
            updatedMessages.push({
              messageId: message._id,
              status: message.status,
              deliveredTo: message.deliveredTo,
              seenBy: message.seenBy
            });
          }
        }

        // Broadcast to sender
        socket.to(chatId).emit('messages_seen', {
          messages: updatedMessages,
          seenBy: socket.userId
        });
      } catch (error) {
        console.error('Error updating message seen status:', error);
      }
    });

    /**
     * Get online users in a chat
     */
    socket.on('get_online_users', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId).populate('participants', '_id');
        
        if (!chat) {
          return socket.emit('error', { message: 'Chat not found' });
        }

        // Check if user is participant
        const isParticipant = chat.participants.some(
          p => p._id.toString() === socket.userId
        );

        if (!isParticipant) {
          return socket.emit('error', { message: 'Access denied' });
        }

        // Get online participants
        const participantIds = chat.participants.map(p => p._id.toString());
        const onlineUserIds = Array.from(onlineUsers.values());
        const onlineInChat = participantIds.filter(id => onlineUserIds.includes(id));

        socket.emit('online_users_in_chat', {
          chatId,
          onlineUsers: onlineInChat
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to get online users' });
      }
    });

    /**
     * Disconnect event
     */
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.user.username} (${socket.id})`);

      // Remove from online users
      onlineUsers.delete(socket.id);

      // Update user status to offline with lastSeen
      await User.findByIdAndUpdate(socket.userId, {
        online: false,
        lastSeen: new Date()
      });

      // Remove from all typing indicators
      typingUsers.forEach((users, chatId) => {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          // Notify others
          socket.to(chatId).emit('user_stop_typing', {
            chatId,
            userId: socket.userId,
            username: socket.user.username
          });
        }
      });

      // Broadcast offline status to all user's chats
      userChats.forEach(chat => {
        io.to(chat._id.toString()).emit('user_offline', {
          userId: socket.userId,
          username: socket.user.username,
          lastSeen: new Date()
        });
      });
    });

    /**
     * WebRTC Signaling Events
     */
    socket.on('call_user', ({ userToCall, signalData, from, callType }) => {
      for (const [sId, uId] of onlineUsers.entries()) {
        if (uId === userToCall) {
          io.to(sId).emit('call_user', { signal: signalData, from, callType });
          // Notify caller that it's ringing
          socket.emit('call_ringing', { from: userToCall });
          console.log(`📞 Call initiated from ${from} to ${userToCall} (${callType})`);
          break;
        }
      }
    });

    socket.on('answer_call', ({ signal, to, callStartTime }) => {
      for (const [sId, uId] of onlineUsers.entries()) {
        if (uId === to) {
          io.to(sId).emit('call_accepted', { signal, callStartTime });
          break;
        }
      }
    });

    socket.on('call_picked_up', ({ to }) => {
      for (const [sId, uId] of onlineUsers.entries()) {
        if (uId === to) {
          io.to(sId).emit('call_picked_up');
          break;
        }
      }
    });

    socket.on('decline_call', async ({ from, chatId, callType }) => {
      for (const [sId, uId] of onlineUsers.entries()) {
        if (uId === from) {
          io.to(sId).emit('call_declined');
          break;
        }
      }
      
      if (chatId && from) {
        try {
          const message = new Message({
            chat: chatId,
            sender: from,
            messageType: 'call',
            type: 'call',
            callData: {
              callType,
              duration: 0,
              status: 'declined'
            }
          });
          await message.save();
          await message.populate('sender', 'username profilePicture');
          await Chat.findByIdAndUpdate(chatId, {
            latestMessage: message._id,
            updatedAt: new Date()
          });
          
          const messageObj = message.toObject();
          io.to(chatId).emit('new_call_log', messageObj);
          socket.emit('new_call_log', messageObj);
        } catch (error) {
          console.error('Error logging declined call:', error);
        }
      }
    });

    socket.on('end_call', async ({ to, chatId, callType, duration, from, status }) => {
      if (to) {
        for (const [sId, uId] of onlineUsers.entries()) {
          if (uId === to) {
            io.to(sId).emit('call_ended');
            break;
          }
        }
      }
      
      if (chatId && from && callType !== undefined) {
        try {
          const message = new Message({
            chat: chatId,
            sender: from,
            messageType: 'call',
            type: 'call',
            callData: {
              callType,
              duration: duration || 0,
              status: status || 'completed'
            }
          });
          await message.save();
          await message.populate('sender', 'username profilePicture');
          await Chat.findByIdAndUpdate(chatId, {
            latestMessage: message._id,
            updatedAt: new Date()
          });
          
          const messageObj = message.toObject();
          io.to(chatId).emit('new_call_log', messageObj);
          socket.emit('new_call_log', messageObj);
        } catch (error) {
          console.error('Error logging ended call:', error);
        }
      }
    });

    /**
     * Profile update event
     * Broadcast profile changes to all users in the same chats
     */
    socket.on('profile_updated', async (profileData) => {
      try {
        // Get all chats where this user is a participant
        const userChats = await Chat.find({
          participants: socket.userId
        }).select('_id');

        // Broadcast profile update to all user's chats
        userChats.forEach(chat => {
          socket.to(chat._id.toString()).emit('user_profile_updated', {
            userId: socket.userId,
            profileData: {
              username: profileData.username,
              profilePicture: profileData.profilePicture,
              bio: profileData.bio,
              about: profileData.about
            }
          });
        });

        console.log(`📝 Profile updated for ${socket.user.username}`);
      } catch (error) {
        console.error('Error broadcasting profile update:', error);
      }
    });

    /**
     * Error handling
     */
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

module.exports = initializeSocket;
