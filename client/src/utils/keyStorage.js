import localforage from 'localforage';
import { encryptPrivateKey, decryptPrivateKey } from './crypto';

// Configure localforage for encrypted key storage
const keyStore = localforage.createInstance({
  name: 'whatele-chat',
  storeName: 'encryption_keys',
});

/**
 * Store encrypted private key in IndexedDB
 */
export const storePrivateKey = async (privateKey, password) => {
  try {
    const encryptedData = await encryptPrivateKey(privateKey, password);
    await keyStore.setItem('privateKey', encryptedData);
    return true;
  } catch (error) {
    console.error('Error storing private key:', error);
    throw new Error('Failed to store private key');
  }
};

/**
 * Retrieve and decrypt private key from IndexedDB
 */
export const retrievePrivateKey = async (password) => {
  try {
    const encryptedData = await keyStore.getItem('privateKey');
    
    if (!encryptedData) {
      return null;
    }
    
    const privateKey = await decryptPrivateKey(encryptedData, password);
    return privateKey;
  } catch (error) {
    console.error('Error retrieving private key:', error);
    throw error;
  }
};

/**
 * Check if private key exists
 */
export const hasStoredPrivateKey = async () => {
  try {
    const encryptedData = await keyStore.getItem('privateKey');
    return !!encryptedData;
  } catch (error) {
    return false;
  }
};

/**
 * Clear stored private key (on logout)
 */
export const clearPrivateKey = async () => {
  try {
    await keyStore.removeItem('privateKey');
    return true;
  } catch (error) {
    console.error('Error clearing private key:', error);
    return false;
  }
};
