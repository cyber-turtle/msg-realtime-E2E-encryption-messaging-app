import React from 'react';
import { Phone, X, Video } from 'lucide-react';

const CallModal = ({ caller, onAccept, onReject, callType }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000] animate-[fadeIn_0.3s_ease]">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-[90%] max-w-sm flex flex-col items-center gap-6 border border-gray-100">
        
        {/* Avatar Container with Sound Halo Effect */}
        <div className="relative mb-4 flex items-center justify-center">
          {/* Animated Halos for Voice Calls - Made subtle and contained */}
          {callType === 'voice' && (
            <>
              <div className="absolute w-32 h-32 rounded-full border border-emerald-500/30 animate-pulse"></div>
              <div className="absolute w-36 h-36 rounded-full border border-emerald-500/10 animate-pulse delay-75"></div>
            </>
          )}
          
          {/* Avatar */}
          <div className="w-28 h-28 rounded-full bg-gray-100 p-1 relative z-10 shadow-lg">
            {caller.profilePicture ? (
              <img 
                src={caller.profilePicture} 
                alt={caller.username} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center text-4xl font-bold text-emerald-600">
                {caller.username[0].toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Call Type Icon Badge */}
          <div className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md z-20 text-emerald-600">
            {callType === 'video' ? <Video size={20} /> : <Phone size={20} />}
          </div>
        </div>
        
        {/* Text Info */}
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-gray-800">{caller.username}</h3>
          <p className="text-gray-500 font-medium flex items-center justify-center gap-2">
            Incoming {callType} call...
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-8 mt-4">
          <button 
            onClick={onReject} 
            className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all duration-300 shadow-sm hover:shadow-red-200 hover:scale-110 group"
            title="Decline"
          >
            <X size={28} className="group-hover:rotate-90 transition-transform" />
          </button>
          
          <button 
            onClick={onAccept} 
            className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all duration-300 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:scale-110"
            title="Accept"
          >
            <Phone size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
