import { FiTrash2, FiX, FiCornerUpRight, FiMic, FiPhone, FiImage, FiFile } from 'react-icons/fi';
import api from '../api/axios';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

const MessageActions = ({ message, onClose, onForward }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const { activeChat } = useChatStore();
  const { user } = useAuthStore();

  const isSender = message.sender._id === user.id;
  const canDeleteForAll = isSender && 
    (Date.now() - new Date(message.createdAt).getTime()) < 3600000;

  const handleDelete = async (deleteForEveryone) => {
    setDeleting(true);
    setError('');

    try {
      await api.delete(`/messages/${message._id}`, {
        data: { deleteForEveryone }
      });

      useChatStore.setState(state => ({
        messages: {
          ...state.messages,
          [activeChat._id]: state.messages[activeChat._id].filter(
            m => m._id !== message._id
          )
        }
      }));

      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete message');
    } finally {
      setDeleting(false);
    }
  };

  const getMessagePreview = () => {
    if (message.type === 'audio' || message.messageType === 'audio') return <span className="flex items-center gap-2"><FiMic /> Voice Message</span>;
    if (message.type === 'call' || message.messageType === 'call') return <span className="flex items-center gap-2"><FiPhone /> Call</span>;
    if (message.type === 'image' || message.messageType === 'image') return <span className="flex items-center gap-2"><FiImage /> Image</span>;
    if (message.type === 'file' || message.messageType === 'file') return <span className="flex items-center gap-2"><FiFile /> File</span>;
    
    if (message.decryptedText && message.decryptedText !== '[Decryption failed]' && message.decryptedText !== '[Failed to decrypt]') {
      return message.decryptedText.substring(0, 100) + (message.decryptedText.length > 100 ? '...' : '');
    }
    
    return 'Message';
  };

  const isCall = message.type === 'call' || message.messageType === 'call';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">Message Options</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <FiX size={24} />
          </button>
        </div>

        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-800 mb-2">{getMessagePreview()}</p>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 text-sm">{error}</div>}

        <div className="p-4 space-y-2">
          {!isCall && (
            <button
              onClick={() => {
                onForward();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition font-medium"
            >
              <FiCornerUpRight size={20} />
              Forward message
            </button>
          )}

          {isSender && (
            <button
              onClick={() => handleDelete(false)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition font-medium"
              disabled={deleting}
            >
              <FiTrash2 size={20} />
              Delete for me
            </button>
          )}

          {canDeleteForAll && (
            <button
              onClick={() => handleDelete(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition font-medium"
              disabled={deleting}
            >
              <FiTrash2 size={20} />
              Delete for everyone
            </button>
          )}

          {!isSender && (
            <button
              onClick={() => handleDelete(false)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition font-medium"
              disabled={deleting}
            >
              <FiTrash2 size={20} />
              Delete for me
            </button>
          )}
        </div>

        {canDeleteForAll && (
          <p className="px-4 pb-4 text-xs text-gray-500 text-center">
            You can delete for everyone within 1 hour of sending
          </p>
        )}
      </div>
    </div>
  );
};

export default MessageActions;
