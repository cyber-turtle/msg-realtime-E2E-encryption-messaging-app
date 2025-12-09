import { useState, useRef, useMemo, useEffect } from 'react';
import { FiX, FiUsers, FiUserPlus, FiLogOut, FiCamera, FiEdit2, FiTrash2, FiCheck, FiSearch, FiArrowLeft } from 'react-icons/fi';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';
import api from '../api/axios';
import ConfirmationModal from './ConfirmationModal';

const GroupInfo = ({ onClose }) => {
  const { user } = useAuthStore();
  const { chats, activeChat, updateGroupInfo, removeParticipant } = useChatStore();
  
  // Use activeChat from store instead of prop - this makes it reactive
  const chat = activeChat;
  
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(chat?.chatName || '');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDangerous: false
  });
  
  const fileInputRef = useRef(null);

  // Update groupName when chat changes
  useEffect(() => {
    if (chat?.chatName) {
      setGroupName(chat.chatName);
    }
  }, [chat?.chatName]);

  // Derive suggested contacts from existing private chats
  const suggestedContacts = useMemo(() => {
    if (!chats || !user || !chat) return [];
    
    // Get all users from private chats
    const contacts = chats
      .filter(c => !c.isGroupChat)
      .map(c => c.participants.find(p => p._id !== user.id))
      .filter(Boolean); // Remove null/undefined
      
    // Filter out users already in the current group
    const currentMemberIds = chat.participants.map(p => p._id);
    
    // Deduplicate by ID
    const uniqueContacts = [];
    const seenIds = new Set();
    
    contacts.forEach(c => {
      if (!seenIds.has(c._id) && !currentMemberIds.includes(c._id)) {
        seenIds.add(c._id);
        uniqueContacts.push(c);
      }
    });
    
    return uniqueContacts;
  }, [chats, chat, user]);

  if (!chat) {
    return null; // Don't render if no active chat
  }

  const isAdmin = chat.admins?.some(admin => 
    (admin._id || admin) === user.id
  );

  const handleUpdateGroup = async () => {
    if (!groupName.trim() || groupName === chat.chatName) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      await updateGroupInfo(chat._id, { chatName: groupName });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update group name:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large. Max 5MB.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const uploadRes = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await updateGroupInfo(chat._id, { chatAvatar: uploadRes.data.imageUrl });
    } catch (error) {
      console.error('Failed to upload group icon:', error);
      alert('Failed to update group icon');
    } finally {
      setUploading(false);
    }
  };

  const confirmRemoveMember = (memberId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member from the group?',
      isDangerous: true,
      onConfirm: () => handleRemoveMember(memberId)
    });
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await removeParticipant(chat._id, memberId);
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const confirmLeaveGroup = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Leave Group',
      message: 'Are you sure you want to leave this group? You will no longer receive messages.',
      isDangerous: true,
      onConfirm: handleLeaveGroup
    });
  };

  const handleLeaveGroup = async () => {
    try {
      await api.delete(`/chats/${chat._id}/leave`);
      window.location.reload(); // Simple way to refresh state/redirect
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const confirmDeleteChat = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Chat',
      message: 'Are you sure you want to delete this chat? All messages will be removed from your device.',
      isDangerous: true,
      onConfirm: handleDeleteChat
    });
  };

  const handleDeleteChat = async () => {
    try {
      // Remove chat from local state
      const { chats, setActiveChat } = useChatStore.getState();
      const updatedChats = chats.filter(c => c._id !== chat._id);
      useChatStore.setState({ chats: updatedChats });
      
      // Clear active chat if it was this one
      setActiveChat(null);
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await api.get(`/users/search?q=${searchQuery}`);
      // Filter out existing participants
      const existingIds = chat.participants.map(p => p._id);
      const filteredUsers = response.data.users.filter(u => !existingIds.includes(u._id));
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await api.post(`/chats/${chat._id}/participants`, { userId });
      setShowAddMember(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to add member:', error);
      alert(error.response?.data?.message || 'Failed to add member');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000]" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {showAddMember && (
                <button 
                  onClick={() => setShowAddMember(false)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <FiArrowLeft size={20} />
                </button>
              )}
              <h3 className="text-xl font-bold text-gray-800">
                {showAddMember ? 'Add Members' : 'Group Info'}
              </h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100">
              <FiX size={24} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6">
            {showAddMember ? (
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </form>

                <div className="space-y-2">
                  {searching ? (
                    <p className="text-center text-gray-500 py-4">Searching...</p>
                  ) : searchQuery ? (
                    searchResults.length > 0 ? (
                      searchResults.map(user => (
                        <div key={user._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              {user.profilePicture ? (
                                <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-gray-500">{user.username[0].toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{user.username}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddMember(user._id)}
                            className="p-2 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors"
                          >
                            <FiUserPlus size={18} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No users found</p>
                    )
                  ) : (
                    // Show Suggested Contacts when no search query
                    <>
                      {suggestedContacts.length > 0 && (
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Suggested Contacts</h4>
                      )}
                      {suggestedContacts.length > 0 ? (
                        suggestedContacts.map(user => (
                          <div key={user._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                {user.profilePicture ? (
                                  <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-bold text-gray-500">{user.username[0].toUpperCase()}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{user.username}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddMember(user._id)}
                              className="p-2 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors"
                            >
                              <FiUserPlus size={18} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-4 text-sm">Search to find more users</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Group Profile Section */}
                <div className="flex flex-col items-center mb-8">
                  <div className="relative group mb-4">
                    <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-3xl font-bold text-emerald-600 overflow-hidden border-4 border-white shadow-lg">
                      {chat.chatAvatar ? (
                        <img src={chat.chatAvatar} alt={chat.chatName} className="w-full h-full object-cover" />
                      ) : (
                        chat.chatName?.[0]?.toUpperCase()
                      )}
                    </div>
                    
                    {isAdmin && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-0 right-0 p-2 bg-emerald-500 text-white rounded-full shadow-md hover:bg-emerald-600 transition-colors"
                      >
                        <FiCamera size={16} />
                      </button>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full justify-center">
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full max-w-[200px]">
                        <input
                          type="text"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          className="w-full px-3 py-1 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-bold text-xl"
                          autoFocus
                        />
                        <button 
                          onClick={handleUpdateGroup}
                          disabled={loading}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full"
                        >
                          <FiCheck size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-gray-800">{chat.chatName}</h2>
                        {isAdmin && (
                          <button 
                            onClick={() => setIsEditing(true)}
                            className="text-gray-400 hover:text-emerald-600 transition-colors"
                          >
                            <FiEdit2 size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-500 mt-1 flex items-center gap-1">
                    <FiUsers size={14} />
                    {chat.participants?.length} members
                  </p>
                </div>

                {/* Members Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-700">Members</h4>
                    {isAdmin && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                        You are Admin
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {chat.participants?.map((participant) => {
                      const isMemberAdmin = chat.admins?.some(admin => 
                        (admin._id || admin) === participant._id
                      );
                      const isMe = participant._id === user.id;
                      
                      return (
                        <div key={participant._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              {participant.profilePicture ? (
                                <img src={participant.profilePicture} alt={participant.username} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-gray-500">{participant.username?.[0]?.toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-800">
                                  {isMe ? 'You' : participant.username}
                                </p>
                                {isMemberAdmin && (
                                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{participant.email}</p>
                            </div>
                          </div>

                          {isAdmin && !isMe && (
                            <button
                              onClick={() => confirmRemoveMember(participant._id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                              title="Remove from group"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!showAddMember && (
            <div className="p-6 border-t border-gray-200 bg-gray-50 space-y-3">
              {/* Show Add Members only if user is still a participant and is admin */}
              {isAdmin && chat.participants?.length < 50 && chat.participants.some(p => p._id === user.id) && (
                <button 
                  onClick={() => setShowAddMember(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition font-medium shadow-sm"
                >
                  <FiUserPlus size={20} />
                  Add Members
                </button>
              )}
              
              {/* Show Leave Group if user is still a participant, Delete Chat if removed */}
              {chat.participants.some(p => p._id === user.id) ? (
                <button 
                  onClick={confirmLeaveGroup}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 transition font-medium"
                >
                  <FiLogOut size={20} />
                  Leave Group
                </button>
              ) : (
                <button 
                  onClick={confirmDeleteChat}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 transition font-medium"
                >
                  <FiTrash2 size={20} />
                  Delete Chat
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={confirmModal.isDangerous}
      />
    </>
  );
};

export default GroupInfo;
