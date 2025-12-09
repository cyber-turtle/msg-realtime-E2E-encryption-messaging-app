/**
 * Audio Helper Utilities
 * - Generate annoying ringtone using Web Audio API
 * - Analyze audio stream for sound-reactive visualizations
 */

// Convert AudioBuffer to WAV Blob
export const bufferToWave = (buffer, sampleRate) => {
  const length = buffer.length;
  const data = buffer.getChannelData(0);
  
  const wav = new ArrayBuffer(44 + length * 2);
  const view = new DataView(wav);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length * 2, true);
  
  // Write audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([wav], { type: 'audio/wav' });
};

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Generate a pleasant ringtone (Soft melodic chime)
export const createRingtone = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const duration = 2.0; // 2 seconds loop
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  
  // Notes for a simple pleasant melody (C5, E5, G5, C6 - Major Arpeggio)
  // Frequencies: C5=523.25, E5=659.25, G5=783.99, C6=1046.50
  const notes = [
    { freq: 523.25, start: 0.0, len: 0.4 },
    { freq: 659.25, start: 0.4, len: 0.4 },
    { freq: 783.99, start: 0.8, len: 0.4 },
    { freq: 1046.50, start: 1.2, len: 0.8 }
  ];

  // Helper to add a note to the buffer
  const addNote = (note) => {
    const startSample = Math.floor(note.start * sampleRate);
    const endSample = Math.floor((note.start + note.len) * sampleRate);
    const attack = 0.05;
    const release = 0.3;

    for (let i = startSample; i < endSample && i < data.length; i++) {
      const t = (i - startSample) / sampleRate;
      
      // Envelope (ADSR-like)
      let envelope = 0;
      if (t < attack) {
        envelope = t / attack;
      } else if (t > note.len - release) {
        envelope = Math.max(0, (note.len - t) / release);
      } else {
        envelope = 1;
      }

      // Sine wave with slight harmonic for "bell" tone
      const sample = (Math.sin(2 * Math.PI * note.freq * t) + 
                     0.5 * Math.sin(2 * Math.PI * note.freq * 2 * t)) * 0.1 * envelope;
      
      data[i] += sample;
    }
  };

  notes.forEach(note => addNote(note));
  
  // Convert to WAV blob and create audio element
  const blob = bufferToWave(buffer, sampleRate);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.loop = true;
  return audio;
};

// Analyze audio stream for visualization ONLY (no playback - for local mic)
export const setupAudioAnalyzerLocal = (stream, onLevelUpdate) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);
  
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  // ONLY connect microphone -> analyser (NO destination = no playback = no echo!)
  microphone.connect(analyser);
  
  let animationId;
  const updateLevel = () => {
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average volume level
    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
    const normalized = average / 255;  // 0 to 1
    
    onLevelUpdate(normalized);
    animationId = requestAnimationFrame(updateLevel);
  };
  
  updateLevel();
  
  // Return cleanup function
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    microphone.disconnect();
    audioContext.close();
  };
};

// Analyze audio stream for visualization AND playback (for partner's voice)
export const setupAudioAnalyzerRemote = (stream, onLevelUpdate) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  // Connect source -> analyser -> destination (analyze AND play partner's voice)
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  
  let animationId;
  const updateLevel = () => {
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average volume level
    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
    const normalized = average / 255;  // 0 to 1
    
    onLevelUpdate(normalized);
    animationId = requestAnimationFrame(updateLevel);
  };
  
  updateLevel();
  
  // Return cleanup function
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    source.disconnect();
    analyser.disconnect();
    audioContext.close();
  };
};
