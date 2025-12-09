import { useState, useRef, useEffect } from 'react';
import { Camera, Edit2, Check, X } from 'lucide-react';
import ImageCropper from './ImageCropper';
import { getCroppedImg } from '../utils/fileHelpers';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

const UserProfile = ({ onClose }) => {
  const { user, updateUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    about: user?.about || "Hi, I'm using MSG",
    profilePicture: user?.profilePicture || ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setSelectedImage(reader.result));
      reader.readAsDataURL(e.target.files[0]);
      setShowCropper(true);
    }
  };

  const handleCropComplete = async (croppedBlob) => {
    setShowCropper(false);
    
    // Convert blob to File with proper name and type
    const file = new File([croppedBlob], 'profile-picture.jpg', { 
      type: 'image/jpeg',
      lastModified: Date.now()
    });
    
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      setLoading(true);
      const response = await api.post('/upload/image', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setFormData(prev => ({ ...prev, profilePicture: response.data.originalUrl }));
      setLoading(false);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setLoading(false);
      alert('Failed to upload image');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await api.put('/users/profile', formData);
      updateUser(res.data.user);
      // Update formData to reflect the saved changes
      setFormData({
        username: res.data.user.username || '',
        bio: res.data.user.bio || '',
        about: res.data.user.about || "Hi, I'm using MSG",
        profilePicture: res.data.user.profilePicture || ''
      });
      setEditing(false);
      setLoading(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setLoading(false);
      alert('Failed to update profile');
    }
  };

  // Sync formData when user changes (e.g., after login or profile update from elsewhere)
  useEffect(() => {
    if (user && !editing) {
      setFormData({
        username: user.username || '',
        bio: user.bio || '',
        about: user.about || "Hi, I'm using MSG",
        profilePicture: user.profilePicture || ''
      });
    }
  }, [user, editing]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] animate-fadeIn p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-100 animate-slideUp" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="sticky top-0 p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <h2 className="text-lg md:text-xl font-bold text-gray-800">My Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>
        
        {/* Profile Section */}
        <div className="p-4 md:p-6 flex flex-col items-center bg-gray-50">
          <div className="relative mb-4">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 overflow-hidden shadow-lg">
              {formData.profilePicture ? (
                <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl md:text-4xl font-bold text-emerald-600 bg-emerald-100">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {editing && (
              <>
                <button 
                  className="absolute bottom-0 right-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                {formData.profilePicture && (
                  <button 
                    className="absolute bottom-0 left-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition"
                    onClick={() => setFormData(prev => ({ ...prev, profilePicture: '' }))}
                    title="Remove profile picture"
                  >
                    <X size={16} className="md:w-[18px] md:h-[18px]" />
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
              </>
            )}
          </div>

          {!editing ? (
            <button 
              className="flex items-center gap-2 px-5 md:px-6 py-2 md:py-2.5 text-sm md:text-base bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition shadow-md font-medium"
              onClick={() => setEditing(true)}
            >
              <Edit2 size={16} /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2 md:gap-3">
              <button 
                className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 text-sm md:text-base bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition shadow-md font-medium disabled:opacity-50"
                onClick={handleSave} 
                disabled={loading}
              >
                <Check size={16} /> Save
              </button>
              <button 
                className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 text-sm md:text-base bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition font-medium"
                onClick={() => setEditing(false)}
              >
                <X size={16} /> Cancel
              </button>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="p-4 md:p-6 space-y-3 md:space-y-4 bg-white">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1.5 md:mb-2">Name</label>
            {editing ? (
              <input
                type="text"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-800 transition"
              />
            ) : (
              <p className="text-sm md:text-base text-gray-800 font-medium">{user?.username}</p>
            )}
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1.5 md:mb-2">About</label>
            {editing ? (
              <input
                type="text"
                value={formData.about}
                onChange={e => setFormData({...formData, about: e.target.value})}
                className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-800 transition"
              />
            ) : (
              <p className="text-sm md:text-base text-gray-600">{user?.about || "Hi, I'm using MSG"}</p>
            )}
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1.5 md:mb-2">Bio</label>
            {editing ? (
              <textarea
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-800 transition resize-none"
                rows="3"
              />
            ) : (
              <p className="text-sm md:text-base text-gray-600">{user?.bio || "No bio set"}</p>
            )}
          </div>
        </div>

        {showCropper && selectedImage && (
          <ImageCropper
            image={selectedImage}
            onCropComplete={handleCropComplete}
            onCancel={() => { setShowCropper(false); setSelectedImage(null); }}
          />
        )}
      </div>
    </div>
  );
};

export default UserProfile;
