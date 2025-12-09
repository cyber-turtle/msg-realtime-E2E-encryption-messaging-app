import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { setupAudioAnalyzerLocal } from '../utils/audioHelpers';

const ActiveCall = ({ 
  partner, 
  callType, 
  stream, 
  partnerStream, 
  onEndCall, 
  isMuted, 
  toggleMute, 
  isVideoEnabled, 
  toggleVideo,
  callStartTime,
  callStatus
}) => {
  const [myAudioLevel, setMyAudioLevel] = useState(0);
  const [partnerAudioLevel, setPartnerAudioLevel] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const partnerAudioRef = useRef(null);
  const partnerVideoRef = useRef(null);
  const myVideoRef = useRef(null);

  // Setup audio analyzer for my stream (Visualization ONLY)
  useEffect(() => {
    if (!stream || isMuted) {
      setMyAudioLevel(0);
      return;
    }

    const cleanup = setupAudioAnalyzerLocal(stream, (level) => {
      setMyAudioLevel(level);
    });

    return cleanup;
  }, [stream, isMuted]);

  // Setup audio analyzer for partner stream (Visualization ONLY)
  useEffect(() => {
    if (!partnerStream || callType !== 'voice') {
      setPartnerAudioLevel(0);
      return;
    }

    const cleanup = setupAudioAnalyzerLocal(partnerStream, (level) => {
      setPartnerAudioLevel(level);
    });

    return cleanup;
  }, [partnerStream, callType]);


  // Handle stream assignment for Voice Call (Audio)
  useEffect(() => {
    if (callType === 'voice' && partnerStream && partnerAudioRef.current) {
      partnerAudioRef.current.srcObject = partnerStream;
    }
  }, [callType, partnerStream]);

  // Call duration timer - only start when connected (partnerStream exists)
  useEffect(() => {
    if (callStatus !== 'connected') {
      setCallDuration(0);
      return;
    }

    // Start timer from 0 when connection is established
    const startTime = Date.now();
    const updateDuration = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setCallDuration(elapsed);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [callStatus]);

  // Format duration
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate halo scale based on audio level
  const getHaloStyle = (audioLevel) => {
    const amplifiedLevel = Math.min(audioLevel * 1.5, 1);
    const scale = 1 + (amplifiedLevel * 0.8);
    const opacity = 0.3 + (amplifiedLevel * 0.6);
    return {
      transform: `scale(${scale})`,
      opacity: opacity,
      transition: 'transform 0.1s ease-out, opacity 0.1s ease-out'
    };
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-[3000] flex flex-col">
      {/* Hidden audio element for voice calls */}
      {callType === 'voice' && (
        <audio ref={partnerAudioRef} autoPlay playsInline />
      )}

      <div className="flex-1 relative flex items-center justify-center p-4">
        {callType === 'voice' ? (
          // Voice Call Display
          <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
            <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
              {/* Sound-reactive halos */}
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30" style={getHaloStyle(partnerAudioLevel)}></div>
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" style={getHaloStyle(partnerAudioLevel * 0.8)}></div>
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/10" style={getHaloStyle(partnerAudioLevel * 0.6)}></div>
              
              {/* Profile picture */}
              <div className="w-40 h-40 rounded-full bg-white p-1 relative z-10 shadow-xl overflow-hidden">
                {partner.profilePicture ? (
                  <img src={partner.profilePicture} alt={partner.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center text-5xl font-bold text-emerald-600">
                    {partner.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{partner.username}</h2>
            <p className="text-emerald-600 font-medium text-lg bg-emerald-50 px-4 py-1 rounded-full">
              {callStatus === 'connected' ? formatDuration(callDuration) : (
                <span className="flex items-center gap-2">
                  {callStatus === 'ringing' ? 'Ringing...' : 'Connecting...'}
                </span>
              )}
            </p>
          </div>
        ) : (
          // Video Call Display
          <div className="w-full h-full max-w-6xl mx-auto relative rounded-3xl overflow-hidden bg-gray-900 shadow-2xl">
            {partnerStream ? (
              <>
                <video 
                  className="w-full h-full object-cover"
                  playsInline 
                  autoPlay 
                  ref={(el) => {
                    if (el && el.srcObject !== partnerStream) {
                      el.srcObject = partnerStream;
                    }
                    partnerVideoRef.current = el;
                  }}
                />
                
                {/* Duration Badge */}
                <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white font-medium text-sm border border-white/10">
                  {formatDuration(callDuration)}
                </div>

                {/* Local Video (PIP) */}
                <div className="absolute bottom-24 right-6 w-32 sm:w-48 aspect-[3/4] bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
                  {isVideoEnabled && stream ? (
                    <video 
                      className="w-full h-full object-cover scale-x-[-1]"
                      playsInline 
                      autoPlay 
                      muted 
                      ref={(el) => {
                        if (el && el.srcObject !== stream) {
                          el.srcObject = stream;
                        }
                        myVideoRef.current = el;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <VideoOff size={24} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Waiting Screen
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
                <div className="relative w-32 h-32 mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping"></div>
                  <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border-4 border-gray-700 relative z-10">
                    {partner.profilePicture ? (
                      <img src={partner.profilePicture} alt={partner.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold">{partner.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2">{partner.username}</h2>
                <p className="text-gray-400 animate-pulse">Calling...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-gray-200/50">
        <button 
          className={`p-4 rounded-full transition-all duration-200 ${isMuted ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        {callType === 'video' && (
          <button 
            className={`p-4 rounded-full transition-all duration-200 ${!isVideoEnabled ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            onClick={toggleVideo}
            title={isVideoEnabled ? "Turn Off Video" : "Turn On Video"}
          >
            {!isVideoEnabled ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        )}

        <button 
          className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 hover:scale-110 hover:shadow-lg hover:shadow-red-200 transition-all duration-200" 
          onClick={onEndCall} 
          title="End Call"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

export default ActiveCall;
