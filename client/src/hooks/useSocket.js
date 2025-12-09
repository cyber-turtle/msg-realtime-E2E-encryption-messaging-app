import { useEffect } from 'react';
import { getSocket } from '../socket';
import useChatStore from '../store/chatStore';

export const useSocket = () => {
  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return;
    }

    const handleMessage = (message) => {
      useChatStore.getState().handleIncomingMessage(message);
    };

    const handleTyping = ({ chatId, userId }) => {
      useChatStore.getState().setTyping(chatId, userId, true);
    };

    const handleStopTyping = ({ chatId, userId }) => {
      useChatStore.getState().setTyping(chatId, userId, false);
    };

    const handleUserOnline = ({ userId }) => {
      useChatStore.getState().setUserOnline(userId, true, null);
    };

    const handleUserOffline = ({ userId, lastSeen }) => {
      useChatStore.getState().setUserOnline(userId, false, lastSeen);
    };

    const handleOnlineUsers = (users) => {
      useChatStore.getState().setOnlineUsers(users);
    };

    const handleStatusUpdate = ({ messageId, status, deliveredTo, seenBy }) => {
      console.log('📨 Status update:', { messageId, status, deliveredTo, seenBy });
      useChatStore.getState().updateMessageStatus(messageId, status, deliveredTo, seenBy);
    };

    const handleMessagesSeen = ({ messages }) => {
      messages.forEach(({ messageId, status, deliveredTo, seenBy }) => {
        useChatStore.getState().updateMessageStatus(messageId, status, deliveredTo, seenBy);
      });
    };

    const handleCallLog = (message) => {
      console.log('📞 Received new_call_log event:', message);
      useChatStore.getState().handleIncomingMessage(message);
    };

    const handleNewChat = async (chat) => {
      console.log('💬 New chat received:', chat);
      await useChatStore.getState().handleNewChat(chat);
    };

    const handleProfileUpdate = ({ userId, profileData }) => {
      console.log('👤 Profile updated:', userId, profileData);
      useChatStore.getState().handleProfileUpdate(userId, profileData);
    };

    const handleTriggerBroadcast = (profileData) => {
      socket.emit('profile_updated', profileData);
    };

    const handleGroupUpdate = (updatedChat) => {
      console.log('👥 Group updated:', updatedChat);
      useChatStore.getState().handleGroupUpdate(updatedChat);
    };

    const handleGroupRemovalNotification = ({ chatId }) => {
      console.log('🚫 Received group removal notification for chat:', chatId);
    };

    const handleChatMemberAdded = ({ userId, chatId }) => {
      console.log('➕ Member added to chat:', { userId, chatId });
      // Refresh chats to get updated participant list
      useChatStore.getState().fetchChats();
    };

    const handleChatMemberRemoved = ({ userId, chatId }) => {
      console.log('➖ Member removed from chat:', { userId, chatId });
      // Refresh chats to get updated participant list
      useChatStore.getState().fetchChats();
    };

    // Connection events


    // Message events
    socket.on('receive_message', handleMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('online_users', handleOnlineUsers);
    socket.on('message_status_update', handleStatusUpdate);
    socket.on('messages_seen', handleMessagesSeen);
    socket.on('new_call_log', handleCallLog);
    socket.on('new_chat', handleNewChat);
    socket.on('user_profile_updated', handleProfileUpdate);
    socket.on('trigger_profile_broadcast', handleTriggerBroadcast);
    socket.on('group_updated', handleGroupUpdate);
    socket.on('group_removal_notification', handleGroupRemovalNotification);
    socket.on('chat_member_added', handleChatMemberAdded);
    socket.on('chat_member_removed', handleChatMemberRemoved);

    // Cleanup
    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('online_users', handleOnlineUsers);
      socket.off('message_status_update', handleStatusUpdate);
      socket.off('messages_seen', handleMessagesSeen);
      socket.off('new_call_log', handleCallLog);
      socket.off('new_chat', handleNewChat);
      socket.off('user_profile_updated', handleProfileUpdate);
      socket.off('trigger_profile_broadcast', handleTriggerBroadcast);
      socket.off('group_updated', handleGroupUpdate);
      socket.off('group_removal_notification', handleGroupRemovalNotification);
      socket.off('chat_member_added', handleChatMemberAdded);
      socket.off('chat_member_removed', handleChatMemberRemoved);
    };
  }, []); // Empty dependency array - only run once
};
