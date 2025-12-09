import { useState } from 'react';
import { FiX, FiSend, FiMic, FiPhone, FiImage, FiFile } from 'react-icons/fi';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';

const ForwardMessage = ({ message, onClose }) => {
  const { chats, forwardMessage } = useChatStore();
  const { user } = useAuthStore();
  const [selectedChats, setSelectedChats] = useState([]);
  const [forwarding, setForwarding] = useState(false);

  const toggleChat = (chatId) => {
    setSelectedChats(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleForward = async () => {
    if (selectedChats.length === 0) return;
    
    setForwarding(true);
    try {
      await forwardMessage(message._id, selectedChats);
      onClose();
    } catch (error) {
      console.error('Error forwarding message:', error);
    } finally {
      setForwarding(false);
    }
  };

  const getMessagePreview = () => {
    if (message.type === 'audio' || message.messageType === 'audio') return <span className="flex items-center gap-2"><FiMic /> Voice Message</span>;
    if (message.type === 'call' || message.messageType === 'call') return <span className="flex items-center gap-2"><FiPhone /> Call</span>;
    if (message.type === 'image' || message.messageType === 'image') return <span className="flex items-center gap-2"><FiImage /> Image</span>;
    if (message.type === 'file' || message.messageType === 'file') return <span className="flex items-center gap-2"><FiFile /> File</span>;
    
    if (message.decryptedText && message.decryptedText !== '[Decryption failed]' && message.decryptedText !== '[Failed to decrypt]') {
      return message.decryptedText.substring(0, 50) + (message.decryptedText.length > 50 ? '...' : '');
    }
    
    return 'Message';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">Forward Message</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <FiX size={24} />
          </button>
        </div>

        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">{getMessagePreview()}</p>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-4">
          <div className="space-y-2">
            {chats.map(chat => {
              const chatName = chat.isGroupChat
                ? chat.chatName || chat.name
                : chat.participants?.find(p => p._id !== user.id)?.username || 'Unknown';
              
              return (
                <div
                  key={chat._id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                    selectedChats.includes(chat._id)
                      ? 'bg-emerald-50 border-2 border-emerald-500'
                      : 'bg-white border-2 border-gray-200 hover:border-emerald-300'
                  }`}
                  onClick={() => toggleChat(chat._id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedChats.includes(chat._id)}
                    onChange={() => toggleChat(chat._id)}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{chatName}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={selectedChats.length === 0 || forwarding}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            <FiSend />
            {forwarding ? 'Forwarding...' : `Forward${selectedChats.length > 0 ? ` (${selectedChats.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessage;
