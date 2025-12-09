import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { decryptFromGroup } from '../utils/crypto';
import useAuthStore from '../store/authStore';
import { FiMic, FiPhone, FiImage, FiFile } from 'react-icons/fi';

const ChatItem = ({ chat, activeChat, setActiveChat, getUnreadCount }) => {
  const { user, privateKey } = useAuthStore();
  const [decryptedName, setDecryptedName] = useState(null);

  useEffect(() => {
    const decryptName = async () => {
      if (chat.isGroupChat && chat.encryptedChatName && chat.encryptedKeys && privateKey) {
        try {
            const encryptedKey = chat.encryptedKeys[user.id];
            if (encryptedKey) {
                const name = await decryptFromGroup(
                    chat.encryptedChatName,
                    encryptedKey,
                    chat.iv,
                    privateKey
                );
                setDecryptedName(name);
            }
        } catch (error) {
            console.error('Failed to decrypt group name', error);
        }
      }
    };
    
    decryptName();
  }, [chat, privateKey, user.id]);

  // Helper to import key if needed
  const getPrivateKeyObj = async () => {
      if (!privateKey) return null;
      // If it's already a CryptoKey (unlikely from store), return it
      // If PEM string, import it
      // ... logic to import ...
      // Actually, let's look at `crypto.js` again to be sure.
  };

  // ...
  
  // For now, let's assume I need to import it.
  // I'll put the full logic in the component.

  const otherUser = chat.isGroupChat ? null : chat.participants.find(p => p._id !== user.id);
  const chatName = decryptedName || (chat.isGroupChat ? chat.chatName : otherUser?.username || 'Unknown');
  const unreadCount = getUnreadCount(chat._id);
  const isSelected = activeChat?._id === chat._id;

  return (
    <div
      className={`flex items-center p-4 cursor-pointer border-b border-gray-100 transition-colors ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
      onClick={() => setActiveChat(chat)}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm mr-3 ${unreadCount > 0 ? 'bg-emerald-500' : 'bg-gray-400'}`}>
        {chat.isGroupChat ? (
          chatName[0]?.toUpperCase()
        ) : (
          otherUser?.profilePicture ? (
            <img src={otherUser.profilePicture} alt={chatName} className="w-full h-full rounded-full object-cover" />
          ) : (
            chatName[0]?.toUpperCase()
          )
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-800 truncate">{chatName}</span>
          {chat.latestMessage && chat.latestMessage.createdAt && !isNaN(new Date(chat.latestMessage.createdAt).getTime()) && (
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(chat.latestMessage.createdAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 truncate mt-0.5 flex items-center gap-1">
          {chat.latestMessage?.type === 'image' ? <><FiImage size={14} /> Image</> : 
           chat.latestMessage?.type === 'file' ? <><FiFile size={14} /> File</> :
           chat.latestMessage?.type === 'audio' ? <><FiMic size={14} /> Voice Message</> :
           chat.latestMessage?.type === 'call' ? <><FiPhone size={14} /> Call</> :
           chat.latestMessage?.decryptedText?.startsWith('📎 ') 
            ? <><FiFile size={14} /> Attachment</> 
            : (chat.latestMessage?.decryptedText || 'No messages yet')}
        </div>
      </div>
      {unreadCount > 0 && (
        <span className="ml-3 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          {unreadCount}
        </span>
      )}
    </div>
  );
};

export default ChatItem;
