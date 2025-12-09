import { useState, useEffect, useRef } from 'react';
import { FiDownload, FiFile, FiPlay, FiPause, FiPhone, FiVideo, FiPhoneIncoming, FiPhoneOutgoing, FiPhoneMissed, FiLock, FiMic } from 'react-icons/fi';
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns';
import LinkPreview from './LinkPreview';
import useAuthStore from '../store/authStore';
import { decryptFile, importPublicKey } from '../utils/crypto';

const MessageBubble = ({ msg, user, chatParticipants, onViewMedia, onCancelUpload }) => {
  const { privateKey } = useAuthStore();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [fileDownloading, setFileDownloading] = useState(false);
  const [fileDownloadProgress, setFileDownloadProgress] = useState(0);
  const [decryptedUrl, setDecryptedUrl] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Handle system messages
  // Handle system messages
  if (msg.type === 'system' || msg.messageType === 'system') {
    let content = msg.content || msg.decryptedText || 'System message';
    
    // Dynamic rendering based on metadata
    if (msg.action) {
      const isMe = (id) => {
        const myId = user._id || user.id;
        if (!id) return false;
        if (typeof id === 'object') {
          return (id._id === myId || id.id === myId);
        }
        return id === myId;
      };
      const getName = (u) => u?.username || 'Someone';
      
      const targetName = getName(msg.targetUser);
      const initiatorName = getName(msg.initiator);
      
      if (msg.action === 'add') {
        if (isMe(msg.targetUser)) {
          content = `You were added by ${initiatorName}`;
        } else if (isMe(msg.initiator)) {
          content = `You added ${targetName}`;
        } else {
          content = `${initiatorName} added ${targetName}`;
        }
      } else if (msg.action === 'remove') {
        if (isMe(msg.targetUser)) {
          content = `You were removed by an admin`;
        } else if (isMe(msg.initiator)) {
          content = `You removed ${targetName}`;
        } else {
          content = `${initiatorName} removed ${targetName}`;
        }
      } else if (msg.action === 'leave') {
        if (isMe(msg.targetUser)) {
          content = `You left the group`;
        } else {
          content = `${targetName} left the group`;
        }
      }
    }

    return (
      <div className="w-full flex justify-center my-2">
        <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 text-sm italic text-center max-w-xs shadow-sm border border-gray-200">
          {content}
        </div>
      </div>
    );
  }

  // Auto-decrypt images and files on load
  useEffect(() => {
    if (msg.media && msg.encryptedKeys && privateKey && !decryptedUrl && !isDecrypting) {
        decryptMedia();
    }
  }, [msg, privateKey]);

  const decryptMedia = async () => {
    if (isDecrypting || decryptedUrl) return;
    setIsDecrypting(true);
    try {
        if (!privateKey) return;

        const encryptedKey = msg.encryptedKeys?.[user.id];
        if (!encryptedKey) throw new Error('No encryption key for this user');

        const ivToUse = msg.media?.iv || msg.iv;
        if (!ivToUse) throw new Error('No IV found for decryption');

        const aesKeyBuffer = await window.crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            privateKey,
            base64ToArrayBuffer(encryptedKey)
        );

        const response = await fetch(msg.media.url);
        if (!response.ok) throw new Error('Failed to download file');
        const encryptedBlob = await response.blob();

        const decryptedBlob = await decryptFile(encryptedBlob, aesKeyBuffer, ivToUse);
        
        const url = URL.createObjectURL(decryptedBlob);
        setDecryptedUrl(url);
        setIsDownloaded(true);
    } catch (error) {
        console.error('Decryption failed:', error);
    } finally {
        setIsDecrypting(false);
    }
  };

  // Helper for base64 to buffer (duplicated from crypto.js to avoid circular deps or just for ease)
  const base64ToArrayBuffer = (base64) => {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const formatMessageTime = (timestamp) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const minutesDiff = differenceInMinutes(now, messageDate);

    if (minutesDiff < 1) return 'less than a minute ago';
    if (format(messageDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) return format(messageDate, 'h:mm a');

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (format(messageDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return `Yesterday ${format(messageDate, 'h:mm a')}`;
    if (format(messageDate, 'yyyy') === format(now, 'yyyy')) return format(messageDate, 'MMM d, h:mm a');
    return format(messageDate, 'MMM d, yyyy h:mm a');
  };

  const getMessageStatus = (msg, chatParticipants) => {
    if (!msg.sender || msg.sender._id !== user.id) return null;
    
    // For group chats, we need to check if ALL participants have seen/delivered
    const isGroupChat = chatParticipants && chatParticipants.length > 2;
    
    if (isGroupChat) {
      // Get all participants except the sender
      const otherParticipants = chatParticipants.filter(p => p._id !== user.id);
      const otherParticipantIds = otherParticipants.map(p => p._id);
      
      // Check if ALL other participants have seen the message
      if (msg.seenBy && msg.seenBy.length > 0) {
        const allSeen = otherParticipantIds.every(id => 
          msg.seenBy.some(seenId => seenId === id)
        );
        if (allSeen) return 'seen';
      }
      
      // Check if ALL other participants have received (delivered) the message
      if (msg.deliveredTo && msg.deliveredTo.length > 0) {
        const allDelivered = otherParticipantIds.every(id => 
          msg.deliveredTo.some(deliveredId => deliveredId === id)
        );
        if (allDelivered) return 'delivered';
      }
      
      return 'sent';
    } else {
      // For 1-on-1 chats, check if the other person has seen/delivered
      if (msg.seenBy && msg.seenBy.length > 0) {
        const seenByOthers = msg.seenBy.some(id => id !== user.id);
        if (seenByOthers) return 'seen';
      }
      
      if (msg.deliveredTo && msg.deliveredTo.length > 0) {
        const deliveredToOthers = msg.deliveredTo.some(id => id !== user.id);
        if (deliveredToOthers) return 'delivered';
      }
      
      return 'sent';
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (downloading || isDownloaded) return;

    setDownloading(true);
    setDownloadProgress(0);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      const publicId = msg.media.publicId || extractPublicId(msg.media.url);
      
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${API_URL}/upload/download?publicId=${encodeURIComponent(publicId)}`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.responseType = 'blob';
      
      xhr.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setDownloadProgress(percentComplete);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          setDownloading(false);
          setIsDownloaded(true);
        } else {
          setDownloading(false);
          alert('Failed to download image');
        }
      };
      
      xhr.onerror = () => {
        setDownloading(false);
        alert('Failed to download image');
      };
      
      xhr.send();
    } catch (error) {
      console.error('Download error:', error);
      setDownloading(false);
    }
  };

  const extractPublicId = (url) => {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)/);
    return match ? match[1] : '';
  };

  const formatCallDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
    return `${secs}s`;
  };

  const renderContent = () => {
    // Image Handling
    if (msg.type === 'image' && msg.media) {
      const isEncrypted = !!msg.encryptedKeys;
      const displayUrl = decryptedUrl || (isEncrypted ? null : (msg.media.thumbnail || msg.media.url));
      const canDecrypt = isEncrypted && msg.encryptedKeys?.[user.id] && (msg.media?.iv || msg.iv);
      
      return (
        <div className="message-media-container">
          <div 
            className="media-image-wrapper cursor-pointer"
            onClick={() => displayUrl && onViewMedia({ url: displayUrl, name: msg.media.fileName, isEncrypted: true })}
          >
            {displayUrl ? (
                <img 
                  src={displayUrl} 
                  alt={msg.media.fileName} 
                  className="media-img" 
                />
            ) : (
                <div className="flex items-center justify-center h-48 bg-gray-100 text-gray-400 flex-col gap-2">
                    <FiLock size={24} />
                    {!canDecrypt ? (
                        <span className="text-xs text-red-500">Cannot decrypt (missing keys)</span>
                    ) : (
                        <span className="text-xs">{isDecrypting ? 'Decrypting...' : 'Decrypting...'}</span>
                    )}
                </div>
            )}
            
            {/* Download Overlay for non-encrypted or already decrypted */}
            {(!isDownloaded && !isEncrypted) && (
              <div className="download-overlay" onClick={handleDownload}>
                <div className="download-content">
                  {downloading ? (
                    <div className="circular-progress">
                      <svg viewBox="0 0 36 36" className="circular-chart">
                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="circle" strokeDasharray={`${downloadProgress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                    </div>
                  ) : (
                    <div className="btn-download-circle">
                      <FiDownload size={24} />
                    </div>
                  )}
                  {!downloading && (
                    <span className="media-size">{(msg.media.fileSize / 1024).toFixed(1)} KB</span>
                  )}
                </div>
              </div>
            )}
            
            {isEncrypted && (
                <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white" title="End-to-End Encrypted">
                    <FiLock size={12} />
                </div>
            )}
          </div>
        </div>
      );
    }

    // File Handling
    if (msg.type === 'file' && msg.media) {
      const isEncrypted = !!msg.encryptedKeys;
      
      const canDecrypt = isEncrypted && msg.encryptedKeys?.[user.id] && (msg.media?.iv || msg.iv);
      
      const handleDownloadFile = async () => {
        if (fileDownloading || isDecrypting) return;
        
        if (isEncrypted && !decryptedUrl) {
            if (!canDecrypt) {
                alert('Cannot decrypt this file: missing encryption keys or IV');
                return;
            }
            await decryptMedia();
            return;
        }

        if (decryptedUrl) {
            const a = document.createElement('a');
            a.href = decryptedUrl;
            a.download = msg.media.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setIsDownloaded(false);
            return;
        }
        
        // Legacy download logic
        setFileDownloading(true);
        setFileDownloadProgress(0);
        
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          const token = localStorage.getItem('token');
          const publicId = msg.media.publicId || extractPublicId(msg.media.url);
          
          const xhr = new XMLHttpRequest();
          xhr.open('GET', `${API_URL}/upload/download?publicId=${encodeURIComponent(publicId)}`, true);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.responseType = 'blob';
          
          xhr.onprogress = (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              setFileDownloadProgress(percentComplete);
            }
          };
          
          xhr.onload = () => {
            if (xhr.status === 200) {
              const blob = xhr.response;
              const blobUrl = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = msg.media.fileName;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(blobUrl);
              document.body.removeChild(a);
              setFileDownloading(false);
              setFileDownloadProgress(0);
            } else {
              setFileDownloading(false);
              setFileDownloadProgress(0);
              alert('Failed to download file. Please try again.');
            }
          };
          
          xhr.onerror = () => {
            setFileDownloading(false);
            setFileDownloadProgress(0);
            alert('Failed to download file. Please try again.');
          };
          
          xhr.send();
        } catch (error) {
          console.error('Download error:', error);
          setFileDownloading(false);
          setFileDownloadProgress(0);
          alert('Failed to download file. Please try again.');
        }
      };

      return (
         <div 
           onClick={handleDownloadFile}
           className="block p-2.5 md:p-3 rounded-xl border border-emerald-500/20 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer group w-full max-w-[280px] md:max-w-[320px]"
         >
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                {fileDownloading || isDecrypting ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <svg className="w-7 h-7 md:w-8 md:h-8" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#d1fae5" strokeWidth="3"/>
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#059669" strokeWidth="3"
                        strokeDasharray={`${fileDownloadProgress || (isDecrypting ? 50 : 0)}, 100`}
                        strokeLinecap="round" transform="rotate(-90 18 18)"/>
                    </svg>
                    {isDecrypting ? (
                         <FiLock size={10} className="md:w-3 md:h-3 absolute" />
                    ) : (
                        <span className="absolute text-[10px] md:text-xs font-bold">{fileDownloadProgress}%</span>
                    )}
                  </div>
                ) : (
                  isEncrypted ? <FiLock size={20} className="md:w-6 md:h-6" /> : <FiFile size={20} className="md:w-6 md:h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm font-medium text-gray-800 truncate">{msg.media.fileName}</div>
                <div className="text-[10px] md:text-xs text-gray-500">
                  {isDecrypting ? 'Decrypting...' : 
                   fileDownloading ? `Downloading... ${fileDownloadProgress}%` : 
                   decryptedUrl ? 'Click to save' :
                   `${(msg.media.fileSize / 1024).toFixed(1)} KB • Click to decrypt`}
                </div>
              </div>
              {!fileDownloading && !isDecrypting && (
                <div className="text-emerald-600 group-hover:text-emerald-700 flex-shrink-0">
                  <FiDownload size={18} className="md:w-5 md:h-5" />
                </div>
              )}
            </div>
         </div>
      );
    }

    // Call Log Handling
    if (msg.type === 'call' && msg.callData) {
      const isOutgoing = msg.sender._id === user.id;
      const { callType, duration, status } = msg.callData;
      
      let CallIcon;
      let callStatusText = '';
      let statusColor = '';
      let bgColor = '';
      
      if (status === 'missed' || status === 'no-answer') {
        CallIcon = FiPhoneMissed;
        callStatusText = status === 'missed' ? 'Missed call' : 'No answer';
        statusColor = 'text-red-500';
        bgColor = 'bg-red-50';
      } else if (isOutgoing) {
        CallIcon = FiPhoneOutgoing;
        if (duration > 0) {
          callStatusText = `Outgoing ${callType} call`;
          statusColor = 'text-emerald-500';
          bgColor = 'bg-emerald-50';
        } else {
          callStatusText = 'Cancelled call';
          statusColor = 'text-red-500';
          bgColor = 'bg-red-50';
        }
      } else {
        CallIcon = FiPhoneIncoming;
        callStatusText = duration > 0 ? `Incoming ${callType} call` : 'Declined call';
        statusColor = 'text-emerald-500';
        bgColor = 'bg-emerald-50';
      }
      
      return (
        <div className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl ${bgColor} border border-gray-100 w-full max-w-[240px] md:max-w-[280px]`}>
          <div className={`p-1.5 md:p-2 rounded-full bg-white shadow-sm ${statusColor}`}>
            {callType === 'video' ? <FiVideo size={16} className="md:w-[18px] md:h-[18px]" /> : <FiPhone size={16} className="md:w-[18px] md:h-[18px]" />}
          </div>
          
          <div className="flex flex-col flex-1 min-w-0">
            <div className={`font-semibold text-xs md:text-sm flex items-center gap-1 md:gap-1.5 ${statusColor}`}>
              <CallIcon size={12} className="md:w-3.5 md:h-3.5 flex-shrink-0" />
              <span className="truncate">{callStatusText}</span>
            </div>
            {duration > 0 && (
              <span className="text-[10px] md:text-xs text-gray-500 font-medium">
                {formatCallDuration(duration)}
              </span>
            )}
          </div>
        </div>
      );
    }

    // Audio Handling
    if (msg.type === 'audio' && msg.media) {
      if (msg.status === 'uploading') {
          return (
             <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl bg-emerald-50 border border-emerald-100 w-full max-w-[240px] md:max-w-[280px] group relative">
                 <div className="p-1.5 md:p-2 rounded-full bg-white shadow-sm text-emerald-600 relative flex-shrink-0">
                     {/* Progress Circle */}
                     <div className="relative w-7 h-7 md:w-8 md:h-8 flex items-center justify-center">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#d1fae5" strokeWidth="3"/>
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#059669" strokeWidth="3"
                            strokeDasharray={`${msg.progress || 0}, 100`}
                            strokeLinecap="round" transform="rotate(-90 18 18)"/>
                        </svg>
                        <span className="absolute text-[9px] md:text-[10px] font-bold">{msg.progress || 0}%</span>
                     </div>
                 </div>
                 <div className="flex-1 min-w-0">
                     <div className="text-xs md:text-sm font-medium text-gray-600 truncate">Uploading voice...</div>
                 </div>
                 {/* Cancel Button (Reveal on Hover) */}
                 <button 
                    onClick={() => onCancelUpload && onCancelUpload(msg._id)}
                    className="absolute inset-0 bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-red-500 font-medium"
                 >
                    Cancel Upload
                 </button>
             </div>
          );
      }

      if (msg.status === 'cancelled') {
          return (
             <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl bg-gray-50 border border-gray-200 w-full max-w-[240px] md:max-w-[280px]">
                 <div className="p-1.5 md:p-2 rounded-full bg-gray-200 text-gray-400 flex-shrink-0">
                     <FiMic size={18} className="md:w-5 md:h-5" />
                 </div>
                 <div className="text-xs md:text-sm text-gray-500 italic truncate">Voice cancelled</div>
             </div>
          );
      }

      const isEncrypted = !!msg.encryptedKeys;
      const displayUrl = decryptedUrl || (isEncrypted ? null : msg.media.url);
      const canDecrypt = isEncrypted && msg.encryptedKeys?.[user.id] && (msg.media?.iv || msg.iv);

      // Custom Audio Player State
      const [isPlaying, setIsPlaying] = useState(false);
      const [currentTime, setCurrentTime] = useState(0);
      const [duration, setDuration] = useState(0);
      const audioRef = useRef(null);

      const togglePlay = async () => {
        if (!displayUrl) {
            await handlePlayAudio();
            return;
        }
        
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
      };

      const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
      };

      const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
      };

      const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };

      const handlePlayAudio = async () => {
        if (isEncrypted && !decryptedUrl) {
            if (!canDecrypt) {
                alert('Cannot decrypt this audio: missing encryption keys or IV');
                return;
            }
            await decryptMedia();
        }
      };

      // Auto-play when decrypted if it was triggered by play button
      useEffect(() => {
          if (decryptedUrl && isPlaying && audioRef.current) {
              audioRef.current.play().catch(e => console.error("Auto-play failed:", e));
          }
      }, [decryptedUrl]);

      return (
        <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl bg-emerald-50 border border-emerald-100 w-full max-w-[280px] md:max-w-[320px]">
          <button 
            onClick={togglePlay}
            className="p-2 md:p-3 rounded-full bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition-colors flex-shrink-0"
          >
             {isPlaying ? <FiPause size={18} className="md:w-5 md:h-5" /> : <FiPlay size={18} className="ml-0.5 md:w-5 md:h-5" />}
          </button>
          
          <div className="flex-1 min-w-0 flex flex-col gap-0.5 md:gap-1">
             {displayUrl && (
                 <audio 
                    ref={audioRef} 
                    src={displayUrl} 
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    className="hidden" 
                 />
             )}
             
             <div className="flex items-center gap-1.5 md:gap-2">
                 <input 
                    type="range" 
                    min="0" 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={handleSeek}
                    className="w-full h-1 md:h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    disabled={!displayUrl}
                 />
             </div>
             
             <div className="flex justify-between text-[10px] md:text-xs text-gray-500 font-medium">
                 <span>{formatTime(currentTime)}</span>
                 <span className="truncate ml-1">{duration ? formatTime(duration) : (isDecrypting ? 'Decrypting...' : 'Voice')}</span>
             </div>
          </div>
          
          {isEncrypted && <FiLock size={12} className="md:w-3.5 md:h-3.5 text-emerald-300 self-start flex-shrink-0" />}
        </div>
      );
    }

    // Text Handling
    const text = msg.decryptedText || '[Decryption failed]';
    
    // Legacy Attachment Check
    if (text.startsWith('📎 ')) {
       const parts = text.substring(2).split(' | ');
       const url = parts[0];
       const fileName = parts[1] || 'File';
       const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName) || url.includes('/image/upload/');
       
       if (isImage) {
         // Reuse image logic for legacy if possible, or simple fallback
         return (
            <div className="message-media" onClick={() => onViewMedia({ url, name: fileName })}>
                <img src={url} alt={fileName} className="media-preview-img" />
            </div>
         );
       }
       return (
         <a href={url} target="_blank" rel="noopener noreferrer" className="message-attachment">
            <div className="attachment-icon">
              <FiFile />
            </div>
            <div className="attachment-info">
              <div className="attachment-name">{fileName}</div>
              <div className="attachment-size">Download</div>
            </div>
            <FiDownload size={20} />
         </a>
       );
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    const hasUrl = urlRegex.test(text);

    if (hasUrl) {
      return (
        <div className="message-text-content">
          <p>
            {parts.map((part, i) => (
              urlRegex.test(part) ? (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="message-link">
                  {part}
                </a>
              ) : (
                <span key={i}>{part}</span>
              )
            ))}
          </p>
          {parts.filter(part => urlRegex.test(part)).map((url, i) => (
            <LinkPreview key={i} url={url} />
          ))}
        </div>
      );
    }

    return <p>{text}</p>;
  };

  return (
    <div className="message-bubble">
      {renderContent()}
      <div className="message-meta">
        <span className="message-time">
          {formatMessageTime(msg.createdAt)}
        </span>
        {msg.sender._id === user.id && (
          <span className={`message-status status-${getMessageStatus(msg, chatParticipants)}`}>
            {getMessageStatus(msg, chatParticipants) === 'seen' && <span style={{ color: '#4fc3f7' }}>✓✓</span>}
            {getMessageStatus(msg, chatParticipants) === 'delivered' && <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>✓✓</span>}
            {getMessageStatus(msg, chatParticipants) === 'sent' && <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>✓</span>}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
