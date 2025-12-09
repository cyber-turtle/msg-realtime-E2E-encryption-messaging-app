import { useState } from 'react';
import { X, Bell, Moon, Lock, Shield } from 'lucide-react';

const Settings = ({ onClose }) => {
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    browserNotifications: true,
    darkMode: false,
  });

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] animate-fadeIn p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-100 animate-slideUp" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="sticky top-0 p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <h2 className="text-lg md:text-xl font-bold text-gray-800">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>
        
        {/* Settings List */}
        <div className="divide-y divide-gray-100">
          
          {/* Notifications Section */}
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <Bell size={18} />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Notifications</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm md:text-base">Push Notifications</p>
                  <p className="text-xs md:text-sm text-gray-500">Receive notifications for new messages</p>
                </div>
                <button
                  onClick={() => handleToggle('notifications')}
                  className={`flex-shrink-0 w-11 h-6 rounded-full transition ${settings.notifications ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.notifications ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm md:text-base">Sound</p>
                  <p className="text-xs md:text-sm text-gray-500">Play sound for incoming messages</p>
                </div>
                <button
                  onClick={() => handleToggle('soundEnabled')}
                  className={`flex-shrink-0 w-11 h-6 rounded-full transition ${settings.soundEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm md:text-base">Browser Notifications</p>
                  <p className="text-xs md:text-sm text-gray-500">Show notifications in browser</p>
                </div>
                <button
                  onClick={() => handleToggle('browserNotifications')}
                  className={`flex-shrink-0 w-11 h-6 rounded-full transition ${settings.browserNotifications ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.browserNotifications ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                <Moon size={18} />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Appearance</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm md:text-base">Dark Mode</p>
                  <p className="text-xs md:text-sm text-gray-500">Coming soon...</p>
                </div>
                <button
                  disabled
                  className="flex-shrink-0 w-11 h-6 rounded-full bg-gray-200 cursor-not-allowed"
                >
                  <div className="w-5 h-5 bg-gray-400 rounded-full shadow translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Section */}
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Lock size={18} />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Privacy & Security</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                <Shield size={16} className="text-emerald-600 flex-shrink-0" />
                <span>All messages are end-to-end encrypted</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 md:p-4 bg-gray-50 text-center">
          <p className="text-xs md:text-sm text-gray-500">WhaTele Chat v1.0.0</p>
        </div>

      </div>
    </div>
  );
};

export default Settings;
