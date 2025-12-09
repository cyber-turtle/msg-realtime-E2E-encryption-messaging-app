import { create } from 'zustand';
import api from '../api/axios';
import { getSocket } from '../socket';
import { encryptMessage, decryptMessage, encryptForGroup, decryptFromGroup } from '../utils/crypto';
import useAuthStore from './authStore';

// Helper to validate Base64 string
const isValidBase64 = (str) => {
    if (!str || typeof str !== 'string') return false;
    try {
        return btoa(atob(str)) === str;
    } catch (err) {
        return false;
    }
};

/**
 * Personalizes system messages for the current user
 * Transforms group messages like "Admin added User" to "You were added by Admin"
 * @param {Object} message - The message object with content
 * @param {Object} user - Current user object with username
 * @returns {string} - Personalized message content
 */
const personalizeSystemMessage = (message, user) => {
  if (!message.content || (message.type !== 'system' && message.messageType !== 'system')) {
    return message.content || '';
  }
  
  // Use metadata if available (new system)
  if (message.action) {
    const isMe = (id) => {
      const myId = user._id || user.id;
      if (!id) return false;
      if (typeof id === 'object') {
        return (id._id === myId || id.id === myId);
      }
      return id === myId;
    };
    const getName = (u) => u?.username || 'Someone';
    
    const targetName = getName(message.targetUser);
    const initiatorName = getName(message.initiator);
    
    if (message.action === 'add') {
      if (isMe(message.targetUser)) {
        return `You were added by ${initiatorName}`;
      } else if (isMe(message.initiator)) {
        return `You added ${targetName}`;
      } else {
        return `${initiatorName} added ${targetName}`;
      }
    } else if (message.action === 'remove') {
      if (isMe(message.targetUser)) {
        return `You were removed by an admin`;
      } else if (isMe(message.initiator)) {
        return `You removed ${targetName}`;
      } else {
        return `${initiatorName} removed ${targetName}`;
      }
    } else if (message.action === 'leave') {
      if (isMe(message.targetUser)) {
        return `You left the group`;
      } else {
        return `${targetName} left the group`;
      }
    }
  }

  // Fallback to regex for legacy messages
  const content = message.content;
  const username = user.username;
  
  // Pattern: "Someone added [current user]" → "You were added by Someone"
  const addedMatch = content.match(/^(.+?)\s+added\s+(.+?)$/i);
  if (addedMatch) {
    const [, adder, addedUser] = addedMatch;
    if (addedUser.toLowerCase() === username.toLowerCase()) {
      return `You were added by ${adder}`;
    }
  }
  
  // Pattern: "Someone removed [current user]" → "You were removed by an admin"
  const removedMatch = content.match(/^(.+?)\s+removed\s+(.+?)$/i);
  if (removedMatch) {
    const [, remover, removedUser] = removedMatch;
    if (removedUser.toLowerCase() === username.toLowerCase()) {
      return 'You were removed by an admin';
    }
  }
  
  // Pattern: "[current user] left the group" → "You left the group"
  const leftMatch = content.match(/^(.+?)\s+left\s+the\s+group$/i);
  if (leftMatch) {
    const [, leaver] = leftMatch;
    if (leaver.toLowerCase() === username.toLowerCase()) {
      return 'You left the group';
    }
  }
  
  // Pattern: "[current user] joined the group" → "You joined the group"
  const joinedMatch = content.match(/^(.+?)\s+joined\s+the\s+group$/i);
  if (joinedMatch) {
    const [, joiner] = joinedMatch;
    if (joiner.toLowerCase() === username.toLowerCase()) {
      return 'You joined the group';
    }
  }
  
  return content;
};

// Helper to deduplicate chats based on _id
const deduplicateChats = (chats) => {
  const seen = new Set();
  const duplicates = [];
  const deduplicated = chats.filter(chat => {
    const id = chat._id;
    if (seen.has(id)) {
      duplicates.push(id);
      return false;
    }
    seen.add(id);
    return true;
  });
  
  if (duplicates.length > 0) {
    console.warn('🔍 Deduplication removed duplicates:', duplicates);
  }
  
  return deduplicated;
};

const useChatStore = create((set, get) => ({
  chats: [],
  activeChat: null,
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  unreadCounts: {},
  loading: false,
  error: null,

  // Fetch all chats
  fetchChats: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/chats');
      const chats = response.data.chats;

      // Extract unread counts from chats
      const unreadCounts = {};
      chats.forEach(chat => {
        unreadCounts[chat._id] = chat.unreadCount || 0;
      });

      // Decrypt latestMessage for each chat
      const { user, privateKey } = useAuthStore.getState();
      if (privateKey) {
        const decryptedChats = await Promise.all(
          chats.map(async (chat) => {
            if (chat.latestMessage && chat.latestMessage.encryptedContent) {
              try {
                let decryptedText;
                const myKey = chat.latestMessage.encryptedKeys?.[user.id];

                if (myKey && chat.latestMessage.iv) {
                  // Validate Base64 before decrypting
                  if (isValidBase64(myKey) && isValidBase64(chat.latestMessage.iv) && isValidBase64(chat.latestMessage.encryptedContent)) {
                    decryptedText = await decryptFromGroup(
                      chat.latestMessage.encryptedContent,
                      myKey,
                      chat.latestMessage.iv,
                      privateKey
                    );
                  } else {
                     decryptedText = '[Invalid encryption data]';
                  }
                } else if (!chat.isGroupChat) {
                  // Fallback for old private messages
                  decryptedText = await decryptMessage(chat.latestMessage.encryptedContent, privateKey);
                }

                return {
                  ...chat,
                  latestMessage: { ...chat.latestMessage, decryptedText }
                };
              } catch (err) {
                console.error('Error decrypting latest message:', err);
                return chat;
              }
            }
            return chat;
          })
        );
        set({ chats: deduplicateChats(decryptedChats), unreadCounts, loading: false });
      } else {
        set({ chats: deduplicateChats(chats), unreadCounts, loading: false });
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      set({ loading: false, error: error.message });
    }
  },

  // Create private chat
  createChat: async (userId) => {
    try {
      const response = await api.post('/chats', { userId });
      const newChat = response.data.chat;
      
      set(state => ({
        chats: state.chats.find(c => c._id === newChat._id) 
          ? state.chats 
          : [newChat, ...state.chats],
        activeChat: newChat,
      }));
      
      return newChat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  },

  // Set active chat
  setActiveChat: async (chat) => {
    const { user } = useAuthStore.getState();
    set({ activeChat: chat });

    // Clear unread count for this chat
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chat._id]: 0,
      },
    }));

    // Fetch messages if not loaded
    if (!get().messages[chat._id]) {
      await get().fetchMessages(chat._id);
    }

    // Join chat room via socket
    const socket = getSocket();
    if (socket) {
      socket.emit('join_chat', chat._id);

      // Wait a bit for messages to load, then mark as seen
      setTimeout(() => {
        const messages = get().messages[chat._id] || [];
        const userId = user._id || user.id;
        const unreadMessageIds = messages
          .filter(msg => {
            const seenBy = msg.seenBy || [];
            const senderId = msg.sender?._id || msg.sender;
            return senderId !== userId && !seenBy.includes(userId);
          })
          .map(msg => msg._id);

        if (unreadMessageIds.length > 0) {
          // Emit delivered for all unread messages
          unreadMessageIds.forEach(msgId => {
            socket.emit('message_delivered', {
              messageId: msgId,
              chatId: chat._id,
            });
          });

          // Emit seen for all unread messages
          socket.emit('message_seen', {
            messageIds: unreadMessageIds,
            chatId: chat._id,
          });
        }
      }, 100);
    }
  },

  // Fetch messages
  fetchMessages: async (chatId) => {
    try {
      const response = await api.get(`/messages/${chatId}`);
      const encryptedMessages = response.data.messages;
      
      // Decrypt all messages
      const { user, privateKey } = useAuthStore.getState();
      const { activeChat } = get();
      
      const decryptedMessages = await Promise.all(
        encryptedMessages.map(async (msg) => {
          try {
            // Skip decryption for call messages
            if (msg.type === 'call' || msg.messageType === 'call') {
              return { ...msg, decryptedText: '' };
            }
            
            let decryptedText;
            
            const userId = user._id || user.id;
            
            // Handle system messages - use content and personalize
            if (msg.type === 'system' || msg.messageType === 'system') {
              decryptedText = personalizeSystemMessage(msg, user);
            } else if (!msg.encryptedContent || typeof msg.encryptedContent !== 'string' || msg.encryptedContent.trim().length === 0) {
              // Validate encryption data before attempting decryption
              decryptedText = '[No encrypted content]';
            } else {
              // Try group decryption first (works for both group and private chats now)
              let myKey = msg.encryptedKeys?.[userId];
              
              // If not found, try converting to string explicitly
              if (!myKey && msg.encryptedKeys && userId) {
                myKey = msg.encryptedKeys[userId.toString()];
              }
              
              // If still not found, try all keys to see if any match
              if (!myKey && msg.encryptedKeys && userId) {
                const userIdStr = userId.toString();
                for (const [key, value] of Object.entries(msg.encryptedKeys)) {
                  if (key === userId || key === userIdStr || key.toString() === userIdStr) {
                    myKey = value;
                    break;
                  }
                }
              }
              
              if (myKey && msg.iv && typeof myKey === 'string' && typeof msg.iv === 'string') {
                try {
                  if (isValidBase64(myKey) && isValidBase64(msg.iv) && isValidBase64(msg.encryptedContent)) {
                      decryptedText = await decryptFromGroup(
                        msg.encryptedContent,
                        myKey,
                        msg.iv,
                        privateKey
                      );
                  } else {
                      decryptedText = '[Invalid encryption data]';
                  }
                } catch (decryptErr) {
                  console.error('Group decryption failed:', decryptErr.message);
                  decryptedText = '[Failed to decrypt]';
                }
              } else if (msg.encryptedContent && !activeChat.isGroupChat) {
                try {
                  decryptedText = await decryptMessage(msg.encryptedContent, privateKey);
                } catch (decryptErr) {
                  console.error('Private decryption failed:', decryptErr.message);
                  decryptedText = '[Failed to decrypt]';
                }
              }
            }
            
            return { ...msg, decryptedText };
          } catch (err) {
            console.error('Decryption error for message:', msg._id, err);
            return { ...msg, decryptedText: '[Failed to decrypt]' };
          }
        })
      );
      
      set(state => ({
        messages: {
          ...state.messages,
          [chatId]: decryptedMessages,
        },
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  },

  // Send message
  sendMessage: async (chatId, text, type = 'text', media = null, encryptionMetadata = null) => {
    const { activeChat } = get();
    const { user, privateKey } = useAuthStore.getState();
    
    try {
      // Use provided encryption metadata (for media files) or encrypt text
      let encryptedData;
      
      if (encryptionMetadata) {
        // Media files are already encrypted, use provided keys and IV
        encryptedData = {
          encryptedContent: text, // This is just a placeholder text
          encryptedKeys: encryptionMetadata.encryptedKeys,
          iv: encryptionMetadata.iv
        };
      } else {
        // Encrypt text message based on chat type
        if (activeChat.isGroupChat) {
          const publicKeys = {};
          activeChat.participants.forEach(p => {
            publicKeys[p._id] = p.publicKey;
          });
          encryptedData = await encryptForGroup(text, publicKeys);
        } else {
          // For private chat, encrypt for both sender and recipient
          const userId = user._id || user.id;
          const recipient = activeChat.participants.find(p => p._id !== userId);
          const publicKeys = {
            [userId]: user.publicKey,
            [recipient._id]: recipient.publicKey
          };
          encryptedData = await encryptForGroup(text, publicKeys);
        }
      }
      
      // Send via API
      const response = await api.post('/messages', {
        chatId,
        messageType: type,
        type: type,
        media,
        ...encryptedData,
      });
      
      const newMessage = { ...response.data.message, decryptedText: encryptionMetadata ? text : text };

      // Add to local state for sender only and update chat's latestMessage
      set(state => {
        // Update messages
        const updatedMessages = {
          ...state.messages,
          [chatId]: [...(state.messages[chatId] || []), newMessage],
        };

        // Update chat's latestMessage
        const updatedChats = state.chats.map(chat =>
          chat._id === chatId
            ? { ...chat, latestMessage: newMessage, updatedAt: new Date() }
            : chat
        );

        // Move updated chat to top
        const chatIndex = updatedChats.findIndex(c => c._id === chatId);
        if (chatIndex > 0) {
          const [movedChat] = updatedChats.splice(chatIndex, 1);
          updatedChats.unshift(movedChat);
        }

        return {
          messages: updatedMessages,
          chats: updatedChats
        };
      });

      // Note: Message is already broadcasted via socket from the API route
      // No need to emit again from client to avoid duplicates

      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Handle incoming message
  handleIncomingMessage: async (message) => {
    const { user, privateKey } = useAuthStore.getState();
    const { activeChat, messages, chats } = get();
    
    // Normalize chat ID to string if it's an object
    if (message.chat && typeof message.chat === 'object') {
      message.chat = message.chat._id;
    }
    
    if (!privateKey) {
      console.error('No private key available for decryption');
      return;
    }
    
    // Don't add if it's our own message (already added in sendMessage)
    // EXCEPT for system messages (which need to be shown to everyone including sender)
    // and call messages (which are never added locally)
    const senderId = message.sender?._id || message.sender;
    const isSystemMessage = message.type === 'system' || message.messageType === 'system';
    const isCallMessage = message.type === 'call' || message.messageType === 'call';
    
    // Allow system messages and call messages to always pass through, even if from current user
    // This fixes display of "You have been removed" and "You have been added by..." messages
    const myId = user._id || user.id;
    const isMyMessage = senderId === myId || senderId?.toString() === myId;
    
    if (isMyMessage && !isSystemMessage && !isCallMessage) {
      return;
    }
    
    try {
      // Decrypt message
      let decryptedText;
      
      // Get chat info to determine encryption type
      let chat = chats.find(c => c._id === message.chat);
      
      // If chat doesn't exist in store, try to fetch it
      if (!chat) {
        try {
          const chatId = typeof message.chat === 'string' ? message.chat : message.chat._id;
          const res = await api.get(`/chats/${chatId}`);
          chat = res.data.chat;
          
          // Add new chat to store - use functional update to prevent race conditions
          set(state => {
            // Check if chat was added while we were fetching
            const existingChat = state.chats.find(c => c._id === chat._id);
            if (existingChat) {
              return {}; // No changes needed
            }
            return {
              chats: deduplicateChats([chat, ...state.chats])
            };
          });
        } catch (err) {
          // For system messages, 404 is expected if user was removed from chat
          // For regular messages, this is an actual error
          if (isSystemMessage && err.response?.status === 404) {
            console.log('📭 System message for chat user no longer has access to');
            return; // Skip gracefully
          }
          console.error('Error fetching new chat:', err);
          return;
        }
      }
      
      // Handle call messages separately (they don't have encrypted content)
      if (message.type === 'call' || message.messageType === 'call') {
        const callMessage = { ...message, decryptedText: '' };
        
        // Check if message already exists
        const existingMessages = messages[message.chat] || [];
        const messageExists = existingMessages.some(m => m._id === message._id);
        
        if (messageExists) {
          return;
        }
        
        // Add to messages if chat is loaded
        if (messages[message.chat]) {
          set(state => ({
            messages: {
              ...state.messages,
              [message.chat]: [...(state.messages[message.chat] || []), callMessage],
            },
          }));
        }
        
        // Update unread count if not in active chat
        if (activeChat?._id !== message.chat) {
          set(state => {
            const currentCount = state.unreadCounts[message.chat] || 0;
            return {
              unreadCounts: {
                ...state.unreadCounts,
                [message.chat]: currentCount + 1,
              },
            };
          });
        }
        
        // Update chat list: Move to top and update latest message
        set(state => {
          const otherChats = state.chats.filter(c => c._id !== message.chat);
          const updatedChat = { ...chat, latestMessage: callMessage };
          return {
            chats: deduplicateChats([updatedChat, ...otherChats])
          };
        });
        
        // Emit delivered status immediately
        const socket = getSocket();
        if (socket) {
          socket.emit('message_delivered', {
            messageId: message._id,
            chatId: message.chat,
          });

          // Only mark as seen if chat is active
          if (activeChat?._id === message.chat) {
            socket.emit('message_seen', {
              messageIds: [message._id],
              chatId: message.chat,
            });
          }
        }
        
        return;
      }
      
      // Try group decryption first (works for both group and private chats now)
      let myKey = message.encryptedKeys?.[user.id];
      
      // If not found, try converting user.id to string explicitly
      if (!myKey && message.encryptedKeys) {
        myKey = message.encryptedKeys[user.id.toString()];
      }
      
      // If still not found, try all keys to see if any match
      if (!myKey && message.encryptedKeys) {
        for (const [key, value] of Object.entries(message.encryptedKeys)) {
          if (key === user.id || key === user.id.toString() || key.toString() === user.id) {
            myKey = value;
            break;
          }
        }
      }

      // Handle system messages (no decryption needed, but personalize for current user)
      if (isSystemMessage) {
        decryptedText = personalizeSystemMessage(message, user);
      } else if (myKey && message.iv) {
        if (isValidBase64(myKey) && isValidBase64(message.iv) && isValidBase64(message.encryptedContent)) {
            decryptedText = await decryptFromGroup(
              message.encryptedContent,
              myKey,
              message.iv,
              privateKey
            );
        } else {
            decryptedText = '[Invalid encryption data]';
        }
      } else if (message.encryptedContent && !chat?.isGroupChat) {
        // Fallback for old private messages
        decryptedText = await decryptMessage(message.encryptedContent, privateKey);
      }
      
      const decryptedMessage = { ...message, decryptedText };
      
      // Check if message already exists
      const existingMessages = messages[message.chat] || [];
      const messageExists = existingMessages.some(m => m._id === message._id);
      
      if (messageExists) {
        if (isSystemMessage) {
          console.log('⚠️ System message already exists, skipping:', message._id, decryptedText);
        }
        return;
      }
      
      if (isSystemMessage) {
        console.log('✅ Adding system message:', decryptedText, 'for user:', user.username);
      }
      
      // For group chats: Filter out messages from gap period (when user was removed)
      if (chat?.isGroupChat && !isSystemMessage) {
        const userId = user._id || user.id;
        const isParticipant = chat.participants.some(p => 
          p._id === userId || p._id?.toString() === userId?.toString()
        );
        
        if (isParticipant) {
          // Check if user was removed and re-added by finding system messages
          // Use new metadata fields if available, fallback to regex
          const removalMsg = existingMessages
            .filter(m => 
              (m.type === 'system' || m.messageType === 'system') && 
              (
                (m.action === 'remove' && (m.targetUser === userId || m.targetUser?._id === userId)) ||
                (!m.action && m.content?.match(new RegExp(`removed.*${user.username}|${user.username}.*removed`, 'i')))
              )
            )
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
          
          if (removalMsg) {
            // Find re-add message after removal
            const reAddMsg = existingMessages
              .filter(m =>
                (m.type === 'system' || m.messageType === 'system') &&
                new Date(m.createdAt) > new Date(removalMsg.createdAt) &&
                (
                  (m.action === 'add' && (m.targetUser === userId || m.targetUser?._id === userId)) ||
                  (!m.action && m.content?.match(new RegExp(`added.*${user.username}|${user.username}.*added`, 'i')))
                )
              )
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
            
            if (reAddMsg) {
              // Check if current message is in gap period
              const msgTime = new Date(message.createdAt);
              const removeTime = new Date(removalMsg.createdAt);
              const reAddTime = new Date(reAddMsg.createdAt);
              
              if (msgTime > removeTime && msgTime < reAddTime) {
                console.log('🚫 Filtering gap period message');
                return; // Skip this message - it's in the gap period
              }
            }
          }
        }
      }
      
      // Add to messages (initialize array if needed for system messages)
      console.log('💬 Adding message to messages array:', {
        chatId: message.chat,
        messageType: message.type || message.messageType,
        isSystemMessage,
        currentMessagesLength: (messages[message.chat] || []).length,
        decryptedText
      });
      
      set(state => ({
        messages: {
          ...state.messages,
          [message.chat]: [...(state.messages[message.chat] || []), decryptedMessage],
        },
      }));
      
      // Update unread count if not in active chat (only for messages from others)
      // SKIP system messages - they should never count as unread
      if (activeChat?._id !== message.chat && !isSystemMessage) {
        set(state => {
          const currentCount = state.unreadCounts[message.chat] || 0;
          const newCount = currentCount + 1;
          
          return {
            unreadCounts: {
              ...state.unreadCounts,
              [message.chat]: newCount,
            },
          };
        });
        
        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          const senderName = message.sender.username;
          const chatName = chat.isGroupChat ? chat.chatName : senderName;
          new Notification(`New message from ${chatName}`, {
            body: decryptedText.length > 50 ? decryptedText.substring(0, 50) + '...' : decryptedText,
            icon: '/vite.svg'
          });
        }
      }
      
      // Update chat list: Move to top and update latest message
      set(state => {
        const otherChats = state.chats.filter(c => c._id !== message.chat);
        const updatedChat = { ...chat, latestMessage: decryptedMessage };
        
        return {
          chats: deduplicateChats([updatedChat, ...otherChats])
        };
      });
      
      // Emit delivered status immediately for all messages
      const socket = getSocket();
      if (socket) {
        socket.emit('message_delivered', {
          messageId: message._id,
          chatId: message.chat,
        });

        // Only mark as seen if chat is active (opened)
        if (activeChat?._id === message.chat) {
          socket.emit('message_seen', {
            messageIds: [message._id],
            chatId: message.chat,
          });
        }
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  },

  // Set typing status
  setTyping: (chatId, userId, isTyping) => {
    set(state => {
      const typingUsers = { ...state.typingUsers };
      if (!typingUsers[chatId]) {
        typingUsers[chatId] = {};
      }
      typingUsers[chatId][userId] = isTyping;
      return { typingUsers };
    });
  },

  // Update online users
  setOnlineUsers: (users) => {
    set({ onlineUsers: users });
  },

  // Update user online status
  setUserOnline: (userId, isOnline, lastSeen = null) => {
    set(state => ({
      chats: state.chats.map(chat => ({
        ...chat,
        participants: chat.participants.map(p =>
          p._id === userId
            ? { ...p, online: isOnline, ...(lastSeen && { lastSeen }) }
            : p
        ),
      })),
      // Also update activeChat if it contains this user
      activeChat: state.activeChat ? {
        ...state.activeChat,
        participants: state.activeChat.participants.map(p =>
          p._id === userId
            ? { ...p, online: isOnline, ...(lastSeen && { lastSeen }) }
            : p
        ),
      } : null,
    }));
  },

  // Update message status (supports both legacy status and new arrays)
  updateMessageStatus: (messageId, status, deliveredTo, seenBy) => {
    set(state => {
      const newMessages = { ...state.messages };

      Object.keys(newMessages).forEach(chatId => {
        newMessages[chatId] = newMessages[chatId].map(msg =>
          msg._id === messageId ? { ...msg, status, deliveredTo, seenBy } : msg
        );
      });

      return { messages: newMessages };
    });
  },

  // Add a message manually (for optimistic UI)
  addMessage: (chatId, message) => {
    set(state => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), message]
      }
    }));
  },

  // Update a specific message (for optimistic UI progress/status)
  updateMessage: (chatId, messageId, updates) => {
    set(state => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map(msg => 
          msg._id === messageId ? { ...msg, ...updates } : msg
        )
      }
    }));
  },

  // Remove a message (for cleaning up optimistic UI)
  removeMessage: (chatId, messageId) => {
    set(state => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).filter(msg => msg._id !== messageId)
      }
    }));
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Get unread count for a chat
  getUnreadCount: (chatId) => {
    return get().unreadCounts[chatId] || 0;
  },

  // Handle new chat notification
  handleNewChat: async (chat) => {
    try {
      const { chats, activeChat } = get();
      const { user, privateKey } = useAuthStore.getState();
      
      // Check if chat already exists
      const existingChat = chats.find(c => c._id === chat._id);
      if (existingChat) return;
      
      // Decrypt latestMessage if present
      let decryptedChat = { ...chat };
      if (chat.latestMessage && chat.latestMessage.encryptedContent && privateKey) {
        try {
          let decryptedText;
          const myKey = chat.latestMessage.encryptedKeys?.[user.id];

          if (myKey && chat.latestMessage.iv) {
            if (isValidBase64(myKey) && isValidBase64(chat.latestMessage.iv) && isValidBase64(chat.latestMessage.encryptedContent)) {
                decryptedText = await decryptFromGroup(
                  chat.latestMessage.encryptedContent,
                  myKey,
                  chat.latestMessage.iv,
                  privateKey
                );
            } else {
                decryptedText = '[Invalid encryption data]';
            }
          } else if (!chat.isGroupChat) {
            decryptedText = await decryptMessage(chat.latestMessage.encryptedContent, privateKey);
          }

          decryptedChat.latestMessage = { ...chat.latestMessage, decryptedText };
        } catch (err) {
          console.error('Error decrypting latest message in new chat:', err);
        }
      }
      
      // Add to chat list at the top with animation class and unread count of 1
      // Also initialize messages array with the first message
      // Add to chat list at the top with animation class and unread count of 1
      // Also initialize messages array with the first message
      set(state => {
        // Double check existence inside the setter to prevent race conditions
        const existingChatCheck = state.chats.find(c => c._id === chat._id);
        if (existingChatCheck) {
            return {}; // Do nothing if already exists
        }

        const newMessages = { ...state.messages };
        if (decryptedChat.latestMessage) {
          newMessages[chat._id] = [decryptedChat.latestMessage];
        }
        
        return {
          chats: deduplicateChats([{ ...decryptedChat, isNew: true }, ...state.chats]),
          messages: newMessages,
          unreadCounts: {
            ...state.unreadCounts,
            [chat._id]: 1
          }
        };
      });

      // Remove animation class after animation completes
      setTimeout(() => {
        set(state => ({
          chats: state.chats.map(c => 
            c._id === chat._id ? { ...c, isNew: false } : c
          )
        }));
      }, 500);

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const otherUser = chat.participants.find(p => p._id !== user.id);
        const messageText = decryptedChat.latestMessage?.decryptedText || 'New message';
        new Notification('New Chat', {
          body: `${otherUser?.username || 'Someone'}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`,
          icon: '/vite.svg'
        });
      }
    } catch (error) {
      console.error('Error handling new chat:', error);
    }
  },

  // Delete chat
  deleteChat: async (chatId) => {
    try {
      await api.delete(`/chats/${chatId}`);
      
      set(state => ({
        chats: state.chats.filter(c => c._id !== chatId),
        activeChat: state.activeChat?._id === chatId ? null : state.activeChat,
        messages: {
          ...state.messages,
          [chatId]: undefined
        }
      }));
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  },

  // Forward message to multiple chats
  forwardMessage: async (messageId, chatIds) => {
    try {
      const { messages, chats } = get();
      const { user, privateKey } = useAuthStore.getState();
      
      // Find the original message
      let originalMessage = null;
      for (const chatId in messages) {
        const found = messages[chatId].find(m => m._id === messageId);
        if (found) {
          originalMessage = found;
          break;
        }
      }
      
      if (!originalMessage) {
        throw new Error('Message not found');
      }

      // Get the decrypted text from the original message
      const textToForward = originalMessage.decryptedText;
      if (!textToForward || textToForward === '[Decryption failed]' || textToForward === '[Failed to decrypt]') {
        throw new Error('Cannot forward message: decryption failed');
      }
      
      // Forward to each selected chat
      for (const chatId of chatIds) {
        // Get chat details to get participants' public keys
        const chat = chats.find(c => c._id === chatId);
        if (!chat) {
          console.error('Chat not found:', chatId);
          continue;
        }

        // Re-encrypt message for destination chat participants
        let encryptedData;
        const userId = user._id || user.id;
        if (chat.isGroupChat) {
          const publicKeys = {};
          chat.participants.forEach(p => {
            publicKeys[p._id] = p.publicKey;
          });
          encryptedData = await encryptForGroup(textToForward, publicKeys);
        } else {
          // For private chat, encrypt for both sender and recipient
          const recipient = chat.participants.find(p => p._id !== userId);
          const publicKeys = {
            [userId]: user.publicKey,
            [recipient._id]: recipient.publicKey
          };
          encryptedData = await encryptForGroup(textToForward, publicKeys);
        }

        // Send forwarded message with encryption data
        const response = await api.post(`/messages/${originalMessage._id}/forward`, {
          chatId: chatId,
          encryptedContent: encryptedData.encryptedContent,
          iv: encryptedData.iv,
          encryptedKeys: encryptedData.encryptedKeys,
          type: originalMessage.type || originalMessage.messageType,
          mediaUrl: originalMessage.mediaUrl
        });

        const forwardedMessage = { ...response.data.message, decryptedText: textToForward };

        // Update local state - add message and move chat to top
        set(state => {
          const updatedMessages = {
            ...state.messages,
            [chatId]: [...(state.messages[chatId] || []), forwardedMessage],
          };

          // Update chat's latestMessage and move to top
          const updatedChats = state.chats.map(c =>
            c._id === chatId
              ? { ...c, latestMessage: forwardedMessage, updatedAt: new Date() }
              : c
          );

          const chatIndex = updatedChats.findIndex(c => c._id === chatId);
          if (chatIndex > 0) {
            const [movedChat] = updatedChats.splice(chatIndex, 1);
            updatedChats.unshift(movedChat);
          }

          return {
            messages: updatedMessages,
            chats: updatedChats
          };
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error forwarding message:', error);
      throw error;
    }
  },

  // Handle profile updates from socket
  handleProfileUpdate: (userId, profileData) => {
    set(state => {
      // Update user in all chats where they appear
      const updatedChats = state.chats.map(chat => ({
        ...chat,
        participants: chat.participants.map(p =>
          p._id === userId
            ? { ...p, ...profileData }
            : p
        )
      }));

      // Update activeChat if it includes this user
      const updatedActiveChat = state.activeChat ? {
        ...state.activeChat,
        participants: state.activeChat.participants.map(p =>
          p._id === userId
            ? { ...p, ...profileData }
            : p
        )
      } : null;

      return {
        chats: updatedChats,
        activeChat: updatedActiveChat
      };
    });
  },
  // Update group info
  updateGroupInfo: async (chatId, data) => {
    try {
      const response = await api.put(`/chats/${chatId}/group`, data);
      const updatedChat = response.data.chat;

      set(state => ({
        chats: state.chats.map(c => c._id === chatId ? updatedChat : c),
        activeChat: state.activeChat?._id === chatId ? updatedChat : state.activeChat
      }));
      
      return updatedChat;
    } catch (error) {
      console.error('Error updating group info:', error);
      throw error;
    }
  },

  // Remove participant from group
  removeParticipant: async (chatId, userId) => {
    try {
      const response = await api.delete(`/chats/${chatId}/participants/${userId}`);
      const updatedChat = response.data.chat;

      set(state => ({
        chats: state.chats.map(c => c._id === chatId ? updatedChat : c),
        activeChat: state.activeChat?._id === chatId ? updatedChat : state.activeChat
      }));
      
      return updatedChat;
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  },

  // Handle group updates from socket (add/remove members, info changes)
  handleGroupUpdate: (updatedChat) => {
    set(state => {
      console.log('📥 Processing group update:', updatedChat._id);
      
      const { user } = useAuthStore.getState();
      const userId = user._id || user.id;
      
      // Check if current user is still a participant
      const isStillParticipant = updatedChat.participants.some(p => p._id === userId);
      
      // If user was removed, remove the chat
      if (!isStillParticipant) {
        return {
          chats: state.chats.filter(c => c._id !== updatedChat._id),
          activeChat: state.activeChat?._id === updatedChat._id ? null : state.activeChat
        };
      }
      
      // Update existing chat or ignore if not in list
      const chatExists = state.chats.some(c => c._id === updatedChat._id);
      
      if (!chatExists) {
          // If it's a group update for a chat we don't have, we might need to add it
          // But usually handleNewChat handles additions. 
          // If we want to be safe, we can add it here if the user is a participant
          if (isStillParticipant) {
               return {
                   chats: deduplicateChats([updatedChat, ...state.chats])
               };
          }
          return {};
      }

      const updatedChats = state.chats.map(c => 
        c._id === updatedChat._id ? updatedChat : c
      );
      
      // Update activeChat if it's the same chat
      const updatedActiveChat = state.activeChat?._id === updatedChat._id 
        ? updatedChat 
        : state.activeChat;
      
      return {
        chats: updatedChats,
        activeChat: updatedActiveChat
      };
    });
  },
}));

export default useChatStore;


