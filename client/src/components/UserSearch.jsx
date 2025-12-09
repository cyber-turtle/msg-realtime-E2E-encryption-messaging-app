import { useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import api from '../api/axios';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';

const UserSearch = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createChat = useChatStore(state => state.createChat);
  const setActiveChat = useChatStore(state => state.setActiveChat);
  const user = useAuthStore(state => state.user);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/users/search?q=${searchQuery}`);
      setSearchResults(response.data.users);
      
      if (response.data.users.length === 0) {
        setError('No users found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async (userId) => {
    try {
      const chat = await createChat(userId);
      await setActiveChat(chat);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create chat');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">Search Users</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSearch} className="p-6 border-b border-gray-100">
          <div className="relative flex items-center mb-4">
            <FiSearch size={20} className="absolute left-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or email..."
              autoFocus
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && <div className="p-4 mx-6 mt-4 bg-red-50 text-red-600 rounded-xl text-sm text-center">{error}</div>}

        <div className="max-h-[400px] overflow-y-auto p-2">
          {searchResults.map((foundUser) => (
            <div key={foundUser._id} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors mx-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg flex-shrink-0">
                {foundUser.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 truncate">{foundUser.username}</div>
                <div className="text-sm text-gray-500 truncate">{foundUser.email}</div>
                {foundUser.bio && <div className="text-xs text-gray-400 truncate mt-0.5">{foundUser.bio}</div>}
              </div>
              <button
                onClick={() => handleCreateChat(foundUser._id)}
                className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-medium rounded-lg transition-colors"
              >
                Chat
              </button>
            </div>
          ))}
          {searchResults.length === 0 && !loading && !error && (
            <div className="p-8 text-center text-gray-400">
              <p>Search for users to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;
