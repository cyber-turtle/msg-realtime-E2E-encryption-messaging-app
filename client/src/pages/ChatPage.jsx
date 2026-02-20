import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { getSocket } from '../socket';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import { formatDistanceToNow } from 'date-fns';
import { Search, Menu, LogOut, User, MessageSquare, Lock, Settings, Send, UserPlus, Paperclip, Smile, Video, Phone, X, MoreVertical, Users } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import UserSearch from '../components/UserSearch';
import CreateGroup from '../components/CreateGroup';
import TypingIndicator from '../components/TypingIndicator';
import MessageActions from '../components/MessageActions';
import ForwardMessage from '../components/ForwardMessage';
import UserProfile from '../components/UserProfile';
import SettingsModal from '../components/Settings';
import GroupInfo from '../components/GroupInfo';
import MediaViewer from '../components/MediaViewer';
import CallModal from '../components/CallModal';
import ActiveCall from '../components/ActiveCall';
import { FiMic, FiSquare } from 'react-icons/fi';
import ContactInfo from '../components/ContactInfo';
import MessageBubble from '../components/MessageBubble';
import ChatItem from '../components/ChatItem';
import ChatHeader from '../components/ChatHeader';
import { compressImage, isValidImageFile, isValidFileSize } from '../utils/fileHelpers';
import { encryptMessage, decryptMessage, encryptFileForChat } from '../utils/crypto';
import { createRingtone } from '../utils/audioHelpers';
import api from '../api/axios';
import axios from 'axios';
import SimplePeer from 'simple-peer';

// Polyfill for global object in Vite environment for simple-peer
if (typeof global === 'undefined') {
  window.global = window;
}

/**
 * MSG_Logo Component
 * Geometric Stealth Visor logo adapted for the light, minimal UI theme.
 */
const Logo = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Main Body - Solid Dark Gray (Tailwind gray-800) */}
    <path 
      d="M100 20 L170 60 V140 L100 180 L30 140 V60 L100 20Z" 
      fill="#1F2937" 
    />
    
    {/* The "M" Cutout / Visor - Solid Emerald-600 accent color */}
    <path 
      d="M60 85 L85 110 L100 95 L115 110 L140 85 V120 H120 V115 L100 135 L80 115 V120 H60 V85Z" 
      fill="#059669" // Emerald-600
    />
    
    {/* Hard Shadow for dimension - Subtle on light background */}
    <path 
      d="M100 180 L100 95 L60 85 V60 L30 60 V140 L100 180Z" 
      fill="black" 
      fillOpacity="0.1" 
    />
  </svg>
);

const ChatPage = () => {
  const { user, logout, privateKey } = useAuthStore();
  const {
    chats,
    activeChat,
    messages,
    fetchChats,
    setActiveChat,
    sendMessage,
    loading,
    typingUsers,
    getUnreadCount,
    addMessage,
    updateMessage,
    removeMessage,
  } = useChatStore();

  const [messageText, setMessageText] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageToForward, setMessageToForward] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);

  // Call State
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [stream, setStream] = useState(null);
  const [partnerStream, setPartnerStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  const connectionRef = useRef();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const ringtoneRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const callInfoRef = useRef(null);
  const callAnsweredRef = useRef(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle, initiating, ringing, connecting, connected
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const emojiPickerRef = useRef(null);
  const uploadControllersRef = useRef({}); // Store abort controllers for uploads

  // Initialize socket
  useSocket();

  // Generate annoying ringtone on mount
  useEffect(() => {
    ringtoneRef.current = createRingtone();
  }, []);

  // Socket Event Listeners for Calls
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('call_user', ({ from, signal, callType }) => {
      const caller = chats.flatMap(c => c.participants).find(p => p._id === from) || { username: 'Unknown User', _id: from };
      setIncomingCall({ caller, signal, callType });
      
      // Play annoying ringtone
      try {
        if (ringtoneRef.current) {
          ringtoneRef.current.loop = true;
          ringtoneRef.current.play().catch(e => console.log('Audio play failed', e));
        }
      } catch (e) {
        console.error('Ringtone error', e);
      }

      // Show browser notification
      if ('Notification' in window && window.Notification) {
        if (window.Notification.permission === 'granted') {
          new window.Notification(`Incoming ${callType} call`, {
            body: `${caller.username} is calling you`,
            icon: caller.profilePicture || '/vite.svg',
            tag: 'incoming-call',
            requireInteraction: true
          });
        } else if (window.Notification.permission === 'default') {
          window.Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new window.Notification(`Incoming ${callType} call`, {
                body: `${caller.username} is calling you`,
                icon: caller.profilePicture || '/vite.svg',
                tag: 'incoming-call',
                requireInteraction: true
              });
            }
          });
        }
      }
    });

    socket.on('call_accepted', async ({ signal, callStartTime }) => {
      if (connectionRef.current) {
        try {
            // Set start time to show "Connecting..." status
            const startTime = callStartTime || Date.now();
            callStartTimeRef.current = startTime;
            setCallStartTime(startTime);
            setCallStatus('connecting');
            connectionRef.current.signal(signal);
        } catch (error) {
            console.error('Error handling call accepted:', error);
        }
      }
    });

    socket.on('call_ringing', () => {
      setCallStatus('ringing');
    });

    socket.on('call_picked_up', () => {
      console.log('📞 Received call_picked_up event, setting status to connecting');
      setCallStatus('connecting');
    });

    socket.on('call_declined', () => {
      cleanupCall();
    });

    socket.on('call_ended', () => {
      cleanupCall();
    });

    socket.on('new_call_log', (message) => {
      useChatStore.getState().handleIncomingMessage(message);
    });

    return () => {
      socket.off('call_user');
      socket.off('call_accepted');
      socket.off('call_declined');
      socket.off('call_ended');
      socket.off('call_ended');
      socket.off('new_call_log');
      socket.off('call_ringing');
      socket.off('call_picked_up');
    };
  }, [chats]);

  useEffect(() => {
    const socket = getSocket();
    if (socket && !socket.connected) socket.connect();
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Dynamic tab title management
  useEffect(() => {
    if (incomingCall) {
      document.title = `${incomingCall.caller.username} calling...`;
    } else if (activeCall) {
      document.title = `Call with ${activeCall.partner.username}`;
    } else {
      document.title = 'WhaTele Chat';
    }

    // Cleanup on unmount
    return () => {
      document.title = 'WhaTele Chat';
    };
  }, [incomingCall, activeCall]);

  const typingTimeoutRef = useRef(null);
  const handleTyping = () => {
    if (activeChat) {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('typing', activeChat._id);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => socket.emit('stop_typing', activeChat._id), 3000);
      }
    }
  };

  const handleStopTyping = () => {
    if (activeChat) {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('stop_typing', activeChat._id);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    }
  };

  const currentTypingUsers = activeChat
    ? Object.entries(typingUsers[activeChat._id] || {})
        .filter(([userId, isTyping]) => isTyping && userId !== user.id)
        .map(([userId]) => activeChat.participants.find(p => p._id === userId)?.username)
        .filter(Boolean)
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[activeChat?._id], currentTypingUsers.length]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleSendAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCancelUpload = (messageId) => {
    if (uploadControllersRef.current[messageId]) {
      uploadControllersRef.current[messageId].abort();
      delete uploadControllersRef.current[messageId];
      updateMessage(activeChat._id, messageId, { status: 'cancelled', progress: 0 });
    }
  };

  const handleSendAudio = async (audioBlob) => {
    if (!activeChat) return;

    const tempId = Date.now().toString();
    const abortController = new AbortController();
    uploadControllersRef.current[tempId] = abortController;

    try {
      // 1. Create optimistic message
      const tempMessage = {
        _id: tempId,
        sender: { ...user, _id: user.id || user._id },
        chat: activeChat._id,
        type: 'audio',
        media: {
          fileName: 'voice_message.webm',
          fileSize: audioBlob.size,
        },
        createdAt: new Date().toISOString(),
        status: 'uploading',
        progress: 0
      };

      addMessage(activeChat._id, tempMessage);

      // 2. Encrypt Audio Blob
      const arrayBuffer = await audioBlob.arrayBuffer();
      const { encryptedContent, iv, encryptedKeys } = await encryptFileForChat(
        arrayBuffer, 
        activeChat, 
        user, 
        activeChat.participants
      );

      // 3. Upload with progress
      const encryptedBlob = new Blob([encryptedContent], { type: 'application/octet-stream' });
      const uploadFormData = new FormData();
      uploadFormData.append('media', encryptedBlob, 'voice_message.webm.enc');
      uploadFormData.append('chatId', activeChat._id);
      
      const response = await api.post('/upload/media', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: abortController.signal,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          updateMessage(activeChat._id, tempId, { progress });
        }
      });

      const { url, publicId } = response.data.cloudinary;

      // 4. Send Message via API (using store action)
      const mediaData = {
        url,
        publicId,
        fileName: 'voice_message.webm',
        fileSize: audioBlob.size,
        iv
      };

      const encryptionMetadata = {
        encryptedKeys,
        iv
      };

      // Use sendMessage from store to handle DB save and broadcasting
      const sentMessage = await sendMessage(
        activeChat._id, 
        'Voice Message', // Placeholder text
        'audio', 
        mediaData, 
        encryptionMetadata
      );

      // 5. Remove optimistic message as the real one is now in the store (via sendMessage)
      removeMessage(activeChat._id, tempId);
      
      delete uploadControllersRef.current[tempId];

    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Upload cancelled');
        updateMessage(activeChat._id, tempId, { status: 'cancelled' });
      } else {
        console.error('Error sending voice message:', error);
        updateMessage(activeChat._id, tempId, { status: 'error' });
        alert('Failed to send voice message');
      }
      delete uploadControllersRef.current[tempId];
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat) return;
    try {
      await sendMessage(activeChat._id, messageText, 'text');
      setMessageText('');
      setShowEmojiPicker(false);
      handleStopTyping();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessageText(prev => prev + emojiData.emoji);
    handleTyping();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidFileSize(file)) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      let fileToUpload = file;
      const isImage = isValidImageFile(file);
      
      // Compress images before encryption (optional, but saves space)
      if (isImage) {
        fileToUpload = await compressImage(file);
      }

      // 1. Generate AES Key for this file
      const fileKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // 2. Encrypt the file
      const { encryptFile, exportPublicKey, importPublicKey } = await import('../utils/crypto');
      const { encryptedBlob, iv } = await encryptFile(fileToUpload, fileKey);

      // 3. Upload Encrypted Blob
      const formData = new FormData();
      // Append as 'media' but it's actually encrypted binary data
      // We use a generic name or keep original extension to hint type, but content is encrypted
      formData.append('media', encryptedBlob, file.name + '.enc'); 
      formData.append('chatId', activeChat._id);
      formData.append('messageId', 'temp-' + Date.now());

      // Use XMLHttpRequest for progress tracking
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percentComplete);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        });
        
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        
        xhr.open('POST', `${API_URL}/upload/media`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      // 4. Encrypt the File Key for each participant
      const exportedFileKey = await window.crypto.subtle.exportKey('raw', fileKey);
      const encryptedKeys = {};

      for (const participant of activeChat.participants) {
        if (participant.publicKey) {
          const pubKey = await importPublicKey(participant.publicKey);
          const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            pubKey,
            exportedFileKey
          );
          
          // Convert ArrayBuffer to Base64
          const bytes = new Uint8Array(encryptedKeyBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          encryptedKeys[participant._id] = window.btoa(binary);
        }
      }

      const mediaData = {
        url: response.media.originalUrl,
        publicId: response.cloudinary.publicId,
        fileName: file.name, // Keep original name for display
        fileSize: response.media.fileSize,
        mimeType: file.type,
        thumbnail: null, // No thumbnail for encrypted images
        iv: iv // Store IV in media object for decryption
      };

      // 5. Send Message with Encryption Metadata
      await sendMessage(
        activeChat._id, 
        isImage ? 'Encrypted Image' : 'Encrypted File', 
        isImage ? 'image' : 'file', 
        mediaData,
        {
            encryptedKeys,
            iv: iv // IV for the file encryption
        }
      );
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Call Functions
  const initiateCall = async (callType) => {
    if (!activeChat || activeChat.isGroupChat) return;
    
    const otherUser = activeChat.participants.find(p => p._id !== user.id);
    if (!otherUser || !otherUser.publicKey) {
        alert('Cannot initiate secure call: User has no public key');
        return;
    }

    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ 
        video: callType === 'video', 
        audio: true 
      });
      setStream(currentStream);
      const callInfo = { partner: otherUser, callType, chatId: activeChat._id, isInitiator: true };
      setActiveCall(callInfo);
      setActiveCall(callInfo);
      callInfoRef.current = callInfo;
      callStartTimeRef.current = null; // Don't set until answered
      setCallStartTime(null);
      setCallStatus('initiating');
      callAnsweredRef.current = false;

      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: currentStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ]
        }
      });

      peer.on('signal', async (data) => {
        const socket = getSocket();
        socket.emit('call_user', {
          userToCall: otherUser._id,
          signalData: data,
          from: user.id,
          callType
        });
      });

      peer.on('stream', (currentStream) => {
        setPartnerStream(currentStream);
        callAnsweredRef.current = true;
      });

      peer.on('connect', () => {
        setCallStatus('connected');
      });

      connectionRef.current = peer;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const answerCall = async () => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ 
        video: incomingCall.callType === 'video', 
        audio: true 
      });
      setStream(currentStream);
      
      const sharedStartTime = Date.now();
      callStartTimeRef.current = sharedStartTime;
      setCallStartTime(sharedStartTime);
      setCallStatus('connecting');
      setIncomingCall(null);
      
      // Find the chat with the caller
      const chatWithCaller = chats.find(c => 
        !c.isGroupChat && c.participants.some(p => p._id === incomingCall.caller._id)
      );
      
      const callInfo = { 
        partner: incomingCall.caller, 
        callType: incomingCall.callType,
        chatId: chatWithCaller?._id,
        isInitiator: false
      };
      setActiveCall(callInfo);
      callInfoRef.current = callInfo;
      callAnsweredRef.current = true;
      
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;

      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream: currentStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ]
        }
      });



      // Notify caller that call is picked up (before WebRTC connection)
      const socket = getSocket();
      console.log('📞 Emitting call_picked_up to:', incomingCall.caller._id);
      socket.emit('call_picked_up', { to: incomingCall.caller._id });

      peer.on('signal', async (data) => {
        const socket = getSocket();
        socket.emit('answer_call', { 
          signal: data, 
          to: incomingCall.caller._id,
          callStartTime: sharedStartTime
        });
      });

      peer.on('stream', (currentStream) => {
        setPartnerStream(currentStream);
      });

      peer.on('connect', () => {
        setCallStatus('connected');
      });

      peer.signal(incomingCall.signal);
      connectionRef.current = peer;
    } catch (err) {
      console.error('Error answering call:', err);
      alert('Could not access camera/microphone.');
      rejectCall();
    }
  };

  const rejectCall = () => {
    try {
      const socket = getSocket();
      if (incomingCall?.caller) {
        const chatWithCaller = chats.find(c => 
          !c.isGroupChat && c.participants.some(p => p._id === incomingCall.caller._id)
        );
        socket.emit('decline_call', { 
          from: incomingCall.caller._id,
          chatId: chatWithCaller?._id,
          callType: incomingCall.callType
        });
      }
      setIncomingCall(null);
      ringtoneRef.current?.pause();
      ringtoneRef.current && (ringtoneRef.current.currentTime = 0);
    } catch (error) {
      console.error('❌ Error in rejectCall:', error);
      setIncomingCall(null);
    }
  };

  const cleanupCall = () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
      
      setIncomingCall(null);
      setActiveCall(null);
      setPartnerStream(null);
      callStartTimeRef.current = null;
      setCallStartTime(null);
      setCallStatus('idle');
      callInfoRef.current = null;
      callAnsweredRef.current = false;
      
      ringtoneRef.current?.pause();
      ringtoneRef.current && (ringtoneRef.current.currentTime = 0);
    } catch (error) {
      console.error('❌ Error in cleanupCall:', error);
    }
  };

  const endCall = () => {
    try {
      const socket = getSocket();
      const callInfo = callInfoRef.current;
      const partnerId = callInfo?.partner?._id;
      const chatId = callInfo?.chatId;
      const isInitiator = callInfo?.isInitiator;
      const callType = callInfo?.callType;
      const startTime = callStartTimeRef.current;
      
      if (partnerId) {
        socket.emit('end_call', { to: partnerId });
      }
      
      if (chatId && startTime && callAnsweredRef.current) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const status = 'completed';
        const initiatorId = isInitiator ? user.id : partnerId;
        socket.emit('end_call', { 
          to: partnerId,
          chatId,
          callType,
          duration,
          status,
          from: initiatorId
        });
      } else if (chatId && !callAnsweredRef.current) {
        socket.emit('end_call', { 
          to: partnerId,
          chatId,
          callType,
          duration: 0,
          status: 'no-answer',
          from: isInitiator ? user.id : partnerId
        });
      }
      
      cleanupCall();
    } catch (error) {
      console.error('❌ Error in endCall:', error);
      cleanupCall();
    }
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
      setIsMuted(!stream.getAudioTracks()[0].enabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
      setIsVideoEnabled(stream.getVideoTracks()[0].enabled);
    }
  };

  const filteredChats = chats.filter(chat => {
    const chatName = chat.isGroupChat 
      ? chat.chatName 
      : chat.participants.find(p => p._id !== user.id)?.username || 'Unknown';
    return chatName.toLowerCase().includes(chatSearchQuery.toLowerCase());
  });

  const currentMessages = activeChat ? messages[activeChat._id] || [] : [];
  const displayedMessages = messageSearchQuery 
    ? currentMessages.filter(msg => msg.decryptedText?.toLowerCase().includes(messageSearchQuery.toLowerCase()))
    : currentMessages;

  if (!privateKey) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-gray-600">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Decrypting your messages...</h2>
          <p>Please wait while we restore your chat session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex font-sans bg-gray-50">
      {/* Sidebar - Hidden on mobile, fixed width on desktop */}
      <div className={`w-full md:w-[320px] bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header / App Title */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="font-extrabold text-xl tracking-widest text-gray-800 logo-text-speed">MSG</span>
          </div>
          <div className="flex gap-3 text-gray-500">
            <button onClick={() => setShowUserSearch(true)} className="hover:text-emerald-600 transition" title="Add Contact"><UserPlus size={20} /></button>
            <button onClick={() => setShowCreateGroup(true)} className="hover:text-emerald-600 transition" title="Create Group"><Users size={20} /></button>
            <button onClick={logout} className="hover:text-emerald-600 transition" title="Logout"><LogOut size={20} /></button>
          </div>
        </div>

        {/* Search Input for Chats */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-4 text-center text-gray-500">Loading chats...</p>}
          {filteredChats.map(chat => (
            <ChatItem 
              key={chat._id} 
              chat={chat} 
              activeChat={activeChat} 
              setActiveChat={setActiveChat} 
              getUnreadCount={getUnreadCount} 
            />
          ))}
          {filteredChats.length === 0 && !loading && <p className="p-4 text-center text-gray-500">No chats found.</p>}
        </div>

        {/* Footer / My Profile */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition flex-1" onClick={() => setShowProfile(true)}>
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-emerald-600 bg-emerald-100">
                  {user.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <span className="font-medium text-sm text-gray-700">My Profile</span>
          </div>
          <button onClick={() => setShowSettings(true)} className="text-gray-500 hover:text-emerald-600 transition" title="Settings">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className={`flex-1 flex flex-col h-full min-w-0 overflow-x-hidden ${activeChat ? 'chat-wallpaper' : ''} ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare size={48} className="text-emerald-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Select a chat to start messaging</h2>
            <p className="text-gray-500 text-sm flex items-center gap-1">
              <Lock size={14} /> Your messages are end-to-end encrypted
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <ChatHeader 
              activeChat={activeChat}
              user={user}
              currentTypingUsers={currentTypingUsers}
              setShowContactInfo={setShowContactInfo}
              setActiveChat={setActiveChat}
              initiateCall={initiateCall}
              setShowMessageSearch={setShowMessageSearch}
              showMessageSearch={showMessageSearch}
              setShowGroupInfo={setShowGroupInfo}
            />

            {/* Message Search Bar */}
            {showMessageSearch && (
              <div className="bg-white p-2 border-b border-gray-200 flex items-center gap-2 px-4">
                <Search size={16} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search messages..." 
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  className="flex-1 text-sm outline-none p-2"
                  autoFocus
                />
                <button onClick={() => {
                  setMessageSearchQuery('');
                  setShowMessageSearch(false);
                }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {displayedMessages.map(msg => {
                const isSystemMessage = msg.type === 'system' || msg.messageType === 'system';
                
                if (isSystemMessage) {
                  return (
                    <MessageBubble 
                      key={msg._id}
                      msg={msg} 
                      user={user}
                      chatParticipants={activeChat.participants}
                      onViewMedia={setViewingMedia}
                      onCancelUpload={handleCancelUpload}
                    />
                  );
                }
                
                // Safety check for sender
                if (!msg.sender || !msg.sender._id) {
                  return null;
                }
                
                return (
                  <div key={msg._id} className={`flex ${msg.sender._id === user.id ? 'justify-end' : 'justify-start'}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedMessage(msg);
                    }}
                    onDoubleClick={() => setSelectedMessage(msg)}
                  >
                    <div className={`max-w-[85%] md:max-w-md p-3 rounded-xl ${msg.sender._id === user.id 
                        ? 'bg-emerald-500 text-white rounded-br-none' 
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'}`}
                    >
                      {activeChat.isGroupChat && msg.sender._id !== user.id && (
                        <div className="text-xs font-bold mb-1 text-emerald-600">{msg.sender.username}</div>
                      )}
                      
                      {/* Message Content - wrapped in a container to control styling */}
                      <div className="message-content-wrapper">
                        <MessageBubble 
                          msg={msg} 
                          user={user} 
                          chatParticipants={activeChat.participants}
                          onViewMedia={setViewingMedia}
                          onCancelUpload={handleCancelUpload}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <TypingIndicator typingUsers={currentTypingUsers} />
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-4 bg-white border-t border-gray-200">
              {activeChat.isGroupChat && !activeChat.participants.some(p => p._id === user.id) ? (
                <div className="p-4 text-center text-gray-500 italic bg-gray-50 rounded-xl border border-gray-100">
                  You cannot send messages because you have been removed from the group
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-center gap-3 relative">
                  {showEmojiPicker && (
                    <div className="absolute bottom-20 left-0 z-50" ref={emojiPickerRef}>
                      <EmojiPicker onEmojiClick={handleEmojiClick} theme="light" />
                    </div>
                  )}
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.txt,.mp3,.mp4,.wav,.m4a,.ogg,.webm,.avi,.mov"
                    className="hidden"
                  />
                  
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-500 hover:text-emerald-600 transition p-2" 
                    title="Attach Image"
                    disabled={uploading}
                  >
                    <Paperclip size={20} />
                  </button>
                  
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      setShowEmojiPicker(false);
                      if (e.target.value.trim()) {
                        handleTyping();
                      } else {
                        handleStopTyping();
                      }
                    }}
                    onBlur={handleStopTyping}
                    placeholder={uploading ? `Uploading... ${uploadProgress}%` : "Type a message..."}
                    className="flex-1 min-w-0 p-3 text-sm rounded-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                    disabled={uploading}
                  />
                  
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-gray-500 hover:text-emerald-600 transition p-2" 
                    title="Emoji"
                  >
                    <Smile size={20} />
                  </button>

                  <button
                    type="button"
                    className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                      isRecording 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'text-gray-500 hover:text-emerald-600'
                    }`}
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    title={isRecording ? "Stop Recording" : "Record Voice Message"}
                  >
                    {isRecording ? <FiSquare size={20} /> : <FiMic size={20} />}
                  </button>

                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-full transition-colors shadow-md" disabled={uploading}>
                    <Send size={20} />
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showUserSearch && <UserSearch onClose={() => setShowUserSearch(false)} />}
      {showCreateGroup && <CreateGroup onClose={() => setShowCreateGroup(false)} />}

      {showGroupInfo && activeChat?.isGroupChat && (
        <GroupInfo onClose={() => setShowGroupInfo(false)} />
      )}
      {showContactInfo && !activeChat?.isGroupChat && (
        <ContactInfo 
          user={activeChat.participants.find(p => p._id !== user.id)} 
          onClose={() => setShowContactInfo(false)} 
          onViewMedia={(media) => setViewingMedia(media)}
        />
      )}
      {selectedMessage && (
        <MessageActions 
          message={selectedMessage} 
          onClose={() => setSelectedMessage(null)}
          onForward={() => {
            setMessageToForward(selectedMessage);
            setSelectedMessage(null);
          }}
        />
      )}
      {messageToForward && (
        <ForwardMessage
          message={messageToForward}
          onClose={() => setMessageToForward(null)}
        />
      )}
      {viewingMedia && (
        <MediaViewer
          mediaUrl={viewingMedia.url}
          fileName={viewingMedia.name}
          onClose={() => setViewingMedia(null)}
        />
      )}
      
      {/* Call Modals */}
      {incomingCall && (
        <CallModal 
          caller={incomingCall.caller} 
          callType={incomingCall.callType}
          onAccept={answerCall}
          onReject={rejectCall}
        />
      )}
      
      {activeCall && (
        <ActiveCall 
          partner={activeCall.partner}
          callType={activeCall.callType}
          stream={stream}
          partnerStream={partnerStream}
          onEndCall={endCall}
          isMuted={isMuted}
          toggleMute={toggleMute}
          isVideoEnabled={isVideoEnabled}
          toggleVideo={toggleVideo}

          callStartTime={callStartTime}
          callStatus={callStatus}
        />
      )}

      {/* Style overrides for MessageBubble to match intro.js light theme exactly */}
      <style>{`
        /* Ultra-specific selectors to override index.css */
        
        /* Make MessageBubble container completely transparent */
        .max-w-xs .message-content-wrapper .message-bubble,
        .md\\:max-w-md .message-content-wrapper .message-bubble {
          background: transparent !important;
          color: inherit !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          border: none !important;
        }

        /* Reset all text elements */
        .max-w-xs .message-content-wrapper .message-bubble p,
        .md\\:max-w-md .message-content-wrapper .message-bubble p,
        .max-w-xs .message-content-wrapper .message-bubble div,
        .md\\:max-w-md .message-content-wrapper .message-bubble div {
          margin: 0 0 4px 0 !important;
          line-height: 1.4 !important;
        }

        /* Override message-meta with exact intro.js styling */
        .max-w-xs .message-content-wrapper .message-meta,
        .md\\:max-w-md .message-content-wrapper .message-meta {
          margin-top: 4px !important;
          display: block !important;
          text-align: right !important;
          font-size: 0.75rem !important;
          opacity: 1 !important;
        }

        /* Override message-time */
        .max-w-xs .message-content-wrapper .message-time,
        .md\\:max-w-md .message-content-wrapper .message-time {
          display: inline-block !important;
          font-size: 0.75rem !important;
        }

        .max-w-xs .message-content-wrapper .message-status,
        .md\\:max-w-md .message-content-wrapper .message-status {
          display: inline-block !important;
          margin-left: 4px !important;
        }

        /* SENT MESSAGE COLORS - bg-emerald-500 parent */
        .bg-emerald-500.text-white .message-content-wrapper,
        .bg-emerald-500.text-white .message-content-wrapper .message-bubble,
        .bg-emerald-500.text-white .message-content-wrapper .message-bubble p,
        .bg-emerald-500.text-white .message-content-wrapper .message-text-content {
          color: white !important;
        }

        /* Sent message timestamp - text-emerald-200 (#a7f3d0) */
        .bg-emerald-500.text-white .message-content-wrapper .message-meta,
        .bg-emerald-500.text-white .message-content-wrapper .message-time,
        .bg-emerald-500.text-white .message-content-wrapper .message-meta * {
          color: #a7f3d0 !important;
        }

        /* RECEIVED MESSAGE COLORS - bg-white parent */
        .bg-white.text-gray-800 .message-content-wrapper,
        .bg-white.text-gray-800 .message-content-wrapper .message-bubble,
        .bg-white.text-gray-800 .message-content-wrapper .message-bubble p,
        .bg-white.text-gray-800 .message-content-wrapper .message-text-content {
          color: #1f2937 !important;
        }

        /* Received message timestamp - text-gray-400 (#9ca3af) */
        .bg-white.text-gray-800 .message-content-wrapper .message-meta,
        .bg-white.text-gray-800 .message-content-wrapper .message-time,
        .bg-white.text-gray-800 .message-content-wrapper .message-meta * {
          color: #9ca3af !important;
        }

        /* Fix status check colors - BLUE for seen (#4fc3f7) */
        /* Don't override inline styles from MessageBubble for seen status */
        .bg-emerald-500.text-white .message-content-wrapper .message-status.status-seen span,
        .bg-emerald-500.text-white .message-content-wrapper .status-seen span {
          color: #4fc3f7 !important;
        }

        /* Other status ticks keep emerald-200 */
        .bg-emerald-500.text-white .message-content-wrapper .message-status.status-delivered span,
        .bg-emerald-500.text-white .message-content-wrapper .message-status.status-sent span {
          color: #a7f3d0 !important;
        }

        .bg-white.text-gray-800 .message-content-wrapper .message-status span {
          color: #9ca3af !important;
        }

        /* Link colors */
        .bg-emerald-500 .message-content-wrapper a {
          color: #d1fae5 !important;
        }

        .bg-white .message-content-wrapper a {
          color: #059669 !important;
        }
      `}</style>
    </div>
  );
};

export default ChatPage;
