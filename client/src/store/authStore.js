import { create } from 'zustand';
import api from '../api/axios';
import { generateKeyPair, exportPublicKey } from '../utils/crypto';
import { storePrivateKey, retrievePrivateKey, clearPrivateKey } from '../utils/keyStorage';
import { initializeSocket, disconnectSocket } from '../socket';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  privateKey: null,
  isAuthenticated: !!localStorage.getItem('token'),
  needsPasswordUnlock: false,
  initializing: true,
  loading: false,
  error: null,

  // Initialize auth state on app load
  initializeAuth: async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const storedPassword = sessionStorage.getItem('userPassword');

    if (token && user && storedPassword) {
      try {
        const privateKey = await retrievePrivateKey(storedPassword);
        if (privateKey) {
          // Initialize socket
          const socket = initializeSocket(token);
          socket.connect();

          set({
            user,
            token,
            privateKey,
            isAuthenticated: true,
            initializing: false,
          });
          return true;
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
      }
    }

    // If no password in session, logout
    if (token && user && !storedPassword) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        initializing: false
      });
      return false;
    }

    set({ initializing: false });
    return false;
  },

  // Unlock private key with password
  unlockPrivateKey: async (password) => {
    const { token } = get();
    try {
      const privateKey = await retrievePrivateKey(password);
      if (privateKey) {
        // Store password in session for future use
        sessionStorage.setItem('userPassword', password);
        
        // Initialize socket if not already connected
        if (token) {
          const socket = initializeSocket(token);
          if (!socket.connected) {
            socket.connect();
          }
        }
        
        set({ privateKey });
        return true;
      }
    } catch (error) {
      console.error('Failed to unlock private key:', error);
      throw error;
    }
    return false;
  },

  // Register with key generation
  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      // Generate encryption keys
      const keyPair = await generateKeyPair();
      const publicKeyPem = await exportPublicKey(keyPair.publicKey);

      // Register with server
      const response = await api.post('/auth/register', {
        ...userData,
        publicKey: publicKeyPem,
      });

      // Store private key encrypted with password
      await storePrivateKey(keyPair.privateKey, userData.password);

      set({
        loading: false,
        error: null,
      });

      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed';
      set({ loading: false, error: errorMsg });
      throw new Error(errorMsg);
    }
  },

  // Login and retrieve private key
  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      // Login
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data;

      // Retrieve and decrypt private key
      const privateKey = await retrievePrivateKey(credentials.password);

      if (!privateKey) {
        throw new Error('Private key not found. Please use the same device you registered on.');
      }

      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      // Store password in session for key retrieval
      sessionStorage.setItem('userPassword', credentials.password);

      // Initialize socket
      const socket = initializeSocket(token);
      socket.connect();

      set({
        user,
        token,
        privateKey,
        isAuthenticated: true,
        initializing: false,
        loading: false,
        error: null,
      });

      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Login failed';
      set({ loading: false, error: errorMsg });
      throw new Error(errorMsg);
    }
  },

  // Logout
  logout: async () => {
    try {
      // Disconnect socket
      disconnectSocket();

      // Clear storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('userPassword');

      set({
        user: null,
        token: null,
        privateKey: null,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Set private key (used after decryption)
  setPrivateKey: (privateKey) => set({ privateKey }),

  // Update user data
  updateUser: (userData) => {
    const updatedUser = { ...get().user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
