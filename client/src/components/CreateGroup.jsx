import { useState } from 'react';
import { FiX, FiSearch } from 'react-icons/fi';
import api from '../api/axios';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';

const CreateGroup = ({ onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchChats = useChatStore(state => state.fetchChats);
  const user = useAuthStore(state => state.user);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.length < 2) return;

    try {
      const response = await api.get(`/users/search?q=${searchQuery}`);
      setSearchResults(response.data.users);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const toggleUser = (foundUser) => {
    if (selectedUsers.find(u => u._id === foundUser._id)) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== foundUser._id));
    } else {
      if (selectedUsers.length >= 49) {
        setError('Maximum 49 participants allowed (50 including you)');
        return;
      }
      setSelectedUsers([...selectedUsers, foundUser]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedUsers.length < 2) {
      setError('At least 2 participants required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/chats/group', {
        chatName: groupName,
        participants: selectedUsers.map(u => u._id),
      });

      await fetchChats();
      onClose();
    } catch (err) {
      console.error('Group creation error:', err);
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-gray-800">Create Group</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          <div className="mb-4 md:mb-6">
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              maxLength={50}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>

          {error && <div className="p-3 md:p-4 mb-4 md:mb-6 bg-red-50 text-red-600 rounded-xl text-xs md:text-sm text-center">{error}</div>}

          <div className="mb-4 md:mb-6">
            <p className="text-xs md:text-sm font-medium text-gray-500 mb-2 md:mb-3 flex justify-between">
              <span>Selected Participants</span>
              <span className={selectedUsers.length >= 49 ? 'text-red-500' : ''}>{selectedUsers.length}/49</span>
            </p>
            <div className="flex flex-wrap gap-1.5 md:gap-2 min-h-[40px]">
              {selectedUsers.map(u => (
                <div key={u._id} className="flex items-center gap-1 pl-2.5 md:pl-3 pr-1 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs md:text-sm font-medium border border-emerald-100">
                  <span className="truncate max-w-[100px] md:max-w-none">{u.username}</span>
                  <button onClick={() => toggleUser(u)} className="p-1 hover:bg-emerald-200 rounded-full transition-colors flex-shrink-0">
                    <FiX size={12} className="md:w-3.5 md:h-3.5" />
                  </button>
                </div>
              ))}
              {selectedUsers.length === 0 && <span className="text-gray-400 text-xs md:text-sm italic">No users selected</span>}
            </div>
          </div>

          <form onSubmit={handleSearch} className="mb-3 md:mb-4">
            <div className="relative flex items-center gap-2">
              <FiSearch size={18} className="absolute left-3 md:left-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 text-sm md:text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
              <button type="submit" className="px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex-shrink-0">
                Search
              </button>
            </div>
          </form>

          <div className="space-y-1.5 md:space-y-2">
            {searchResults.map((foundUser) => {
              const isSelected = selectedUsers.find(u => u._id === foundUser._id);
              
              return (
                <div
                  key={foundUser._id}
                  className={`flex items-center gap-2.5 md:gap-4 p-2.5 md:p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-gray-50 border-transparent'}`}
                  onClick={() => toggleUser(foundUser)}
                >
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm md:text-base font-bold flex-shrink-0">
                    {foundUser.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm md:text-base text-gray-800 truncate">{foundUser.username}</div>
                    <div className="text-xs text-gray-500 truncate">{foundUser.email}</div>
                  </div>
                  <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                    {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 md:w-3 md:h-3 text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3 md:p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2 md:gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 md:px-6 py-2 md:py-2.5 text-sm md:text-base text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            className="px-4 md:px-6 py-2 md:py-2.5 text-sm md:text-base bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none"
            disabled={loading || selectedUsers.length < 2 || !groupName.trim()}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;
