import { useState, useEffect } from 'react';
import { X, Image, File, Download, Trash2, Shield } from 'lucide-react';
import api from '../api/axios';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';
import SafetyNumber from './SafetyNumber';

const ContactInfo = ({ user, onClose, onViewMedia }) => {
  const [activeTab, setActiveTab] = useState('media');
  const [sharedMedia, setSharedMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSafetyNumber, setShowSafetyNumber] = useState(false);
  const messages = useChatStore(state => state.messages);
  const { deleteChat, chats, activeChat } = useChatStore();
  const currentUser = useAuthStore(state => state.user);

  const handleDeleteChat = async () => {
    if (!window.confirm('Delete this chat? This cannot be undone.')) return;
    
    try {
      const chat = chats.find(c => 
        !c.isGroupChat && c.participants.some(p => p._id === user._id)
      );
      
      if (chat) {
        await deleteChat(chat._id);
        onClose();
      }
    } catch (error) {
      alert('Failed to delete chat');
    }
  };

  useEffect(() => {
    const fetchSharedMedia = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/users/${user._id}/media`);
        setSharedMedia(res.data.media);
      } catch (error) {
        console.error('Error fetching media:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSharedMedia();
    }
  }, [user, messages]);

  const images = sharedMedia.filter(m => {
    if (!m.url) return false;
    // Check mimeType first, then fall back to extension
    const isImage = (m.mimeType && m.mimeType.startsWith('image/')) || 
                    (!m.mimeType && m.url.match(/\.(jpg|jpeg|png|gif|webp)$/i));
    return isImage;
  });
  
  const files = sharedMedia.filter(m => {
    if (!m.url) return false;
    // Everything that's not an image is a file
    const isImage = (m.mimeType && m.mimeType.startsWith('image/')) || 
                    (!m.mimeType && m.url.match(/\.(jpg|jpeg|png|gif|webp)$/i));
    return !isImage;
  });

  return (
    <>
      {/* Backdrop - click to close */}
      <div className="fixed inset-0 bg-black/20 z-[899] md:hidden" onClick={onClose}></div>
      
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white shadow-2xl z-[900] flex flex-col animate-slideInRight" onClick={(e) => e.stopPropagation()}>
      
      {/* Header - Sticky */}
      <div className="sticky top-0 z-10 p-3 md:p-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <h2 className="text-lg md:text-xl font-bold text-gray-800">Contact Info</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500 hover:text-gray-800">
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="p-4 md:p-6 flex flex-col items-center bg-gray-50 border-b border-gray-100">
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gray-200 mb-3 md:mb-4 shadow-lg overflow-hidden">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl md:text-4xl font-bold text-emerald-600 bg-emerald-100">
              {user.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">{user.username}</h2>
        <p className="text-gray-500 text-xs md:text-sm mt-1">{user.email}</p>
      </div>

        {/* Details Section */}
        <div className="p-4 md:p-6 space-y-3 md:space-y-4 border-b border-gray-100 bg-white">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">About</label>
            <p className="text-sm md:text-base text-gray-700">{user.about || "Hi, I'm using MSG"}</p>
          </div>
          {user.bio && (
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Bio</label>
              <p className="text-sm md:text-base text-gray-700">{user.bio}</p>
            </div>
          )}
        </div>

        {/* Media Tabs - Sticky */}
        <div className="sticky top-[57px] md:top-[65px] z-10 flex border-b border-gray-200 bg-white">
          <button 
            className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-medium transition ${activeTab === 'media' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('media')}
          >
            Media ({images.length})
          </button>
          <button 
            className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-medium transition ${activeTab === 'files' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('files')}
          >
            Files ({files.length})
          </button>
        </div>

        {/* Media Content */}
        <div className="bg-gray-50 p-3 md:p-4 min-h-[300px]">
          {loading ? (
            <p className="text-center py-8 text-sm md:text-base text-gray-500">Loading...</p>
          ) : activeTab === 'media' ? (
            <div className="grid grid-cols-3 gap-1.5 md:gap-2">
              {images.map((item, index) => (
                <div 
                  key={index} 
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition shadow-sm"
                  onClick={() => onViewMedia && onViewMedia({ url: item.url, name: item.fileName })}
                >
                  <img src={item.thumbnail || item.url} alt="Shared media" className="w-full h-full object-cover" />
                </div>
              ))}
              {images.length === 0 && (
                <p className="col-span-3 text-center py-8 text-sm md:text-base text-gray-400">No media shared</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 md:space-y-2">
              {files.map((item, index) => (
                <div key={index} className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <File size={18} className="md:w-5 md:h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs md:text-sm font-medium text-gray-800 truncate">{item.fileName || 'Unknown File'}</span>
                    <span className="text-[10px] md:text-xs text-gray-500">{item.fileSize ? (item.fileSize / 1024).toFixed(1) + ' KB' : ''}</span>
                  </div>
                  <a href={item.url} download target="_blank" rel="noopener noreferrer" className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full transition text-gray-500 hover:text-emerald-600 flex-shrink-0">
                    <Download size={16} className="md:w-[18px] md:h-[18px]" />
                  </a>
                </div>
              ))}
              {files.length === 0 && (
                <p className="text-center py-8 text-sm md:text-base text-gray-400">No files shared</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions - Sticky Bottom */}
      <div className="sticky bottom-0 p-3 md:p-4 border-t border-gray-200 bg-white space-y-2">
        <button 
          onClick={() => setShowSafetyNumber(true)} 
          className="w-full flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition font-medium"
        >
          <Shield size={16} className="md:w-[18px] md:h-[18px]" />
          View Safety Number
        </button>
        <button 
          onClick={handleDeleteChat} 
          className="w-full flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition font-medium"
        >
          <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
          Delete Chat
        </button>
      </div>

      {showSafetyNumber && (
        <SafetyNumber contact={user} onClose={() => setShowSafetyNumber(false)} />
      )}
      </div>
    </>
  );
};

export default ContactInfo;

/* Add this animation to index.css */
