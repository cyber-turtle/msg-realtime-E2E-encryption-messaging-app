const crypto = require('crypto');
const fs = require('fs');

/**
 * Encrypt file before upload (server-side fallback)
 * Note: For true E2E, this should be done client-side
 */
const encryptFile = (filePath, encryptionKey) => {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const cipher = crypto.createCipher(algorithm, key);
  
  const input = fs.createReadStream(filePath);
  const encryptedPath = filePath + '.encrypted';
  const output = fs.createWriteStream(encryptedPath);
  
  return new Promise((resolve, reject) => {
    input.pipe(cipher).pipe(output);
    
    output.on('finish', () => {
      resolve({
        encryptedPath,
        iv: iv.toString('hex'),
        authTag: 'none'
      });
    });
    
    output.on('error', reject);
  });
};

/**
 * Decrypt file after download (server-side fallback)
 * Note: For true E2E, this should be done client-side
 */
const decryptFile = (encryptedPath, encryptionKey, iv, authTag) => {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const decipher = crypto.createDecipherGCM(algorithm, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  const input = fs.createReadStream(encryptedPath);
  const decryptedPath = encryptedPath.replace('.encrypted', '.decrypted');
  const output = fs.createWriteStream(decryptedPath);
  
  return new Promise((resolve, reject) => {
    input.pipe(decipher).pipe(output);
    
    output.on('finish', () => {
      resolve(decryptedPath);
    });
    
    output.on('error', reject);
  });
};

module.exports = {
  encryptFile,
  decryptFile
};