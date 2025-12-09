/**
 * Safety Number Generation (Signal-style)
 * Generates a unique fingerprint from two users' public keys
 */

export const generateSafetyNumber = async (publicKey1, publicKey2, userId1, userId2) => {
  // Sort keys to ensure same order regardless of who generates
  const [key1, key2, id1, id2] = 
    userId1 < userId2 
      ? [publicKey1, publicKey2, userId1, userId2]
      : [publicKey2, publicKey1, userId2, userId1];

  // Combine keys and IDs
  const combined = `${id1}:${key1}:${id2}:${key2}`;
  
  // Hash with SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Format as 12 groups of 5 digits (60 digits total, Signal-style)
  const digits = hashHex.replace(/[a-f]/g, m => (parseInt(m, 16) % 10).toString());
  const safetyNumber = digits.slice(0, 60).match(/.{1,5}/g).join(' ');
  
  return safetyNumber;
};

export const generateQRCode = async (safetyNumber) => {
  // For production, use a QR library like 'qrcode'
  // For now, return the safety number
  return safetyNumber;
};
