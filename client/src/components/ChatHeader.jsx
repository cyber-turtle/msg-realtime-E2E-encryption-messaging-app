import { useState, useEffect } from 'react';
import { Search, Menu, Video, Phone, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import useAuthStore from '../store/authStore';
import { decryptFromGroup } from '../utils/crypto';

const ChatHeader = ({ 
  activeChat, 
  user, 
  currentTypingUsers, 
  setShowContactInfo, 
  setActiveChat, 
  initiateCall, 
  setShowMessageSearch, 
  showMessageSearch, 
  setShowGroupInfo 
}) => {
  const { privateKey } = useAuthStore();
  const [decryptedName, setDecryptedName] = useState(null);

  useEffect(() => {
    const decryptName = async () => {
      if (activeChat.isGroupChat && activeChat.encryptedChatName && activeChat.encryptedKeys && privateKey) {
        try {
            const encryptedKey = activeChat.encryptedKeys[user.id];
            if (encryptedKey) {
                const name = await decryptFromGroup(
                    activeChat.encryptedChatName,
                    encryptedKey,
                    activeChat.iv,
                    privateKey
                );
                setDecryptedName(name);
            }
        } catch (error) {
            console.error('Failed to decrypt group name', error);
        }
      } else {
          setDecryptedName(null);
      }
    };
    
    decryptName();
  }, [activeChat, privateKey, user.id]);

  const displayChatName = decryptedName || (activeChat.isGroupChat 
    ? activeChat.chatName 
    : activeChat.participants.find(p => p._id !== user.id)?.username);

  return (
    <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between shadow-sm cursor-pointer" onClick={() => !activeChat.isGroupChat && setShowContactInfo(true)}>
      <div className="flex items-center">
        {/* Back button for mobile */}
        <button className="md:hidden mr-3 text-gray-500" onClick={(e) => { e.stopPropagation(); setActiveChat(null); }}>
          <ArrowLeft size={24} />
        </button>

        <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center font-bold text-white text-md mr-3">
          {activeChat.isGroupChat ? (
            displayChatName?.[0]?.toUpperCase()
          ) : (
            activeChat.participants.find(p => p._id !== user.id)?.profilePicture ? (
              <img src={activeChat.participants.find(p => p._id !== user.id).profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              activeChat.participants.find(p => p._id !== user.id)?.username?.[0]?.toUpperCase()
            )
          )}
        </div>
        
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-gray-800">
            {displayChatName}
          </span>
          <span className="text-xs text-emerald-500 font-medium">
            {activeChat.isGroupChat
              ? `${activeChat.participants.length} members`
              : currentTypingUsers.length > 0
              ? 'typing...'
              : activeChat.participants.find(p => p._id !== user.id)?.online
              ? 'Online'
              : activeChat.participants.find(p => p._id !== user.id)?.lastSeen
              ? `Last seen ${formatDistanceToNow(new Date(activeChat.participants.find(p => p._id !== user.id)?.lastSeen), { addSuffix: true })}`
              : 'Offline'}
          </span>
        </div>
      </div>
      
      <div className="flex gap-4 text-gray-500" onClick={(e) => e.stopPropagation()}>
        {!activeChat.isGroupChat && (
          <>
            <button onClick={() => initiateCall('video')} className="hover:text-emerald-600 transition p-1" title="Video Call">
              <Video size={20} />
            </button>
            <button onClick={() => initiateCall('voice')} className="hover:text-emerald-600 transition p-1" title="Voice Call">
              <Phone size={20} />
            </button>
          </>
        )}
        <button 
          onClick={() => setShowMessageSearch(!showMessageSearch)} 
          className={`hover:text-emerald-600 transition p-1 ${showMessageSearch ? 'text-emerald-600' : ''}`}
          title="Search in chat"
        >
          <Search size={20} />
        </button>
        {activeChat.isGroupChat && (
          <button onClick={() => setShowGroupInfo(true)} className="hover:text-emerald-600 transition p-1" title="Group Info">
            <Menu size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
