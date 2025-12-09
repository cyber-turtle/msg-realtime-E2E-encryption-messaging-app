/**
 * E2E Encryption Utilities using Web Crypto API
 * Supports both private chat (RSA) and group chat (AES + RSA) encryption
 */

// Generate RSA-OAEP key pair for user
export const generateKeyPair = async () => {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    return keyPair;
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw new Error('Failed to generate encryption keys');
  }
};

// Export public key to PEM format for server storage
export const exportPublicKey = async (publicKey) => {
  try {
    const exported = await window.crypto.subtle.exportKey('spki', publicKey);
    const exportedAsString = arrayBufferToBase64(exported);
    const pem = `-----BEGIN PUBLIC KEY-----\n${exportedAsString}\n-----END PUBLIC KEY-----`;
    return pem;
  } catch (error) {
    console.error('Error exporting public key:', error);
    throw new Error('Failed to export public key');
  }
};

// Import public key from PEM format
export const importPublicKey = async (pemKey) => {
  try {
    const pemContents = pemKey
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '');
    
    const binaryDer = base64ToArrayBuffer(pemContents);
    
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['encrypt']
    );
    
    return publicKey;
  } catch (error) {
    console.error('Error importing public key:', error);
    throw new Error('Failed to import public key');
  }
};

// Encrypt private key with password for local storage
export const encryptPrivateKey = async (privateKey, password) => {
  try {
    // Export private key
    const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
    
    // Derive key from password
    const passwordKey = await deriveKeyFromPassword(password);
    
    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt private key
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      passwordKey,
      exported
    );
    
    return {
      encrypted: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv),
    };
  } catch (error) {
    console.error('Error encrypting private key:', error);
    throw new Error('Failed to encrypt private key');
  }
};

// Decrypt private key with password
export const decryptPrivateKey = async (encryptedData, password) => {
  try {
    const { encrypted, iv } = encryptedData;
    
    // Derive key from password
    const passwordKey = await deriveKeyFromPassword(password);
    
    // Decrypt
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToArrayBuffer(iv),
      },
      passwordKey,
      base64ToArrayBuffer(encrypted)
    );
    
    // Import private key
    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      decrypted,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['decrypt']
    );
    
    return privateKey;
  } catch (error) {
    console.error('Error decrypting private key:', error);
    throw new Error('Failed to decrypt private key. Wrong password?');
  }
};

// Encrypt message for private chat (RSA)
export const encryptMessage = async (text, recipientPublicKeyPem) => {
  try {
    const publicKey = await importPublicKey(recipientPublicKeyPem);
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      data
    );
    
    return {
      encryptedContent: arrayBufferToBase64(encrypted),
      iv: null, // Not needed for RSA
    };
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw new Error('Failed to encrypt message');
  }
};

// Decrypt message for private chat (RSA)
export const decryptMessage = async (encryptedContent, privateKey) => {
  try {
    const encrypted = base64ToArrayBuffer(encryptedContent);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Error decrypting message:', error);
    return '[Decryption failed]';
  }
};

// Encrypt message for group chat (AES + RSA)
export const encryptForGroup = async (text, participantPublicKeys) => {
  try {
    // Generate random AES key
    const aesKey = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt message with AES
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      data
    );
    
    // Export AES key
    const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    
    // Encrypt AES key for each participant
    const encryptedKeys = {};
    
    for (const [userId, publicKeyPem] of Object.entries(participantPublicKeys)) {
      const publicKey = await importPublicKey(publicKeyPem);
      
      const encryptedKey = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        publicKey,
        exportedAesKey
      );
      
      encryptedKeys[userId] = arrayBufferToBase64(encryptedKey);
    }
    
    return {
      encryptedContent: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv),
      encryptedKeys,
    };
  } catch (error) {
    console.error('Error encrypting for group:', error);
    throw new Error('Failed to encrypt group message');
  }
};

// Decrypt message from group chat (AES + RSA)
export const decryptFromGroup = async (encryptedContent, encryptedKey, iv, privateKey) => {
  try {
    // Decrypt AES key with private key
    const encryptedAesKey = base64ToArrayBuffer(encryptedKey);
    
    const decryptedAesKey = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      encryptedAesKey
    );
    
    // Import AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      decryptedAesKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['decrypt']
    );
    
    // Decrypt message
    const encrypted = base64ToArrayBuffer(encryptedContent);
    const ivBuffer = base64ToArrayBuffer(iv);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      aesKey,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Error decrypting from group:', error);
    return '[Decryption failed]';
  }
};

// Helper: Derive key from password
const deriveKeyFromPassword = async (password) => {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('whatele-chat-salt'), // In production, use unique salt per user
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
  
  return derivedKey;
};

// Helper: Convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Helper: Convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  try {
    if (!base64 || typeof base64 !== 'string') {
      throw new Error('Invalid base64 input');
    }
    const cleanBase64 = base64.trim().replace(/[^A-Za-z0-9+/=]/g, '');
    if (cleanBase64.length === 0) {
      throw new Error('Empty base64 string');
    }
    // Validate base64 length (must be multiple of 4)
    if (cleanBase64.length % 4 !== 0) {
      throw new Error('Invalid base64 length');
    }
    const binary = window.atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error('Base64 decode error:', error.message);
    throw new Error('Invalid base64 string');
  }
};

// Encrypt file (AES-GCM)
export const encryptFile = async (file, key) => {
  try {
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Import key if it's raw bytes/string, otherwise use as is
    let cryptoKey = key;
    if (!(key instanceof CryptoKey)) {
        // Assume key is raw bytes or hex string
        // For simplicity, let's assume it's an exported raw key (ArrayBuffer)
        // If it's a string, convert to buffer
        let keyBuffer = key;
        if (typeof key === 'string') {
            // If hex string
            const match = key.match(/.{1,2}/g);
            const bytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
            keyBuffer = bytes.buffer;
        }
        
        cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
    }

    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      buffer
    );

    return {
      encryptedBlob: new Blob([encryptedContent]),
      iv: arrayBufferToBase64(iv)
    };
  } catch (error) {
    console.error('Error encrypting file:', error);
    throw new Error('Failed to encrypt file');
  }
};

// Decrypt file (AES-GCM)
export const decryptFile = async (encryptedBlob, key, ivBase64) => {
  try {
    const buffer = await encryptedBlob.arrayBuffer();
    const iv = base64ToArrayBuffer(ivBase64);

    // Import key if needed
    let cryptoKey = key;
    if (!(key instanceof CryptoKey)) {
         let keyBuffer = key;
        if (typeof key === 'string') {
            const match = key.match(/.{1,2}/g);
            const bytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
            keyBuffer = bytes.buffer;
        }
        
        cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
    }

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      buffer
    );

    return new Blob([decryptedContent]);
  } catch (error) {
    console.error('Error decrypting file:', error);
    throw new Error('Failed to decrypt file');
  }
};

// Encrypt file for chat (Private or Group)
export const encryptFileForChat = async (fileArrayBuffer, chat, currentUser, participants) => {
  try {
    // 1. Generate random AES key
    const aesKey = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );

    // 2. Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 3. Encrypt file content
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      fileArrayBuffer
    );

    // 4. Export AES key
    const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey);

    // 5. Encrypt AES key for each participant
    const encryptedKeys = {};
    
    // Ensure we have public keys for all recipients
    const recipients = participants || chat.participants;

    for (const participant of recipients) {
      if (participant.publicKey) {
         const publicKey = await importPublicKey(participant.publicKey);
         const encryptedKey = await window.crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            publicKey,
            exportedAesKey
         );
         encryptedKeys[participant._id] = arrayBufferToBase64(encryptedKey);
      }
    }
    
    // Also encrypt for self if not in list
    if (!encryptedKeys[currentUser.id] && currentUser.publicKey) {
         const publicKey = await importPublicKey(currentUser.publicKey);
         const encryptedKey = await window.crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            publicKey,
            exportedAesKey
         );
         encryptedKeys[currentUser.id] = arrayBufferToBase64(encryptedKey);
    }

    return {
      encryptedContent: encryptedContent, // Return as ArrayBuffer
      iv: arrayBufferToBase64(iv),
      encryptedKeys
    };

  } catch (error) {
    console.error('Error encrypting file for chat:', error);
    throw new Error('Failed to encrypt file for chat');
  }
};
