import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatPage from './pages/ChatPage';
import VerifyEmail from './pages/VerifyEmail';
import CheckEmail from './pages/CheckEmail';
import PasswordPrompt from './components/PasswordPrompt';

function App() {
  const { isAuthenticated, initializeAuth, unlockPrivateKey, privateKey, initializing } = useAuthStore();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    // Initialize auth state on app load
    const initAuth = async () => {
      const result = await initializeAuth();
      if (result === 'needsPassword') {
        setShowPasswordPrompt(true);
      }
    };
    
    initAuth();
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handlePasswordSubmit = async (password) => {
    setUnlocking(true);
    try {
      await unlockPrivateKey(password);
      setShowPasswordPrompt(false);
    } catch (error) {
      alert('Invalid password. Please try again.');
    } finally {
      setUnlocking(false);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordPrompt(false);
    // Logout user if they cancel password prompt
    useAuthStore.getState().logout();
  };

  if (initializing) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>WhaTele Chat</h1>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login /> : <Navigate to="/" />} 
          />
          <Route 
            path="/register" 
            element={!isAuthenticated ? <Register /> : <Navigate to="/" />} 
          />
          <Route 
            path="/check-email" 
            element={<CheckEmail />} 
          />
          <Route 
            path="/verify-email/:token" 
            element={<VerifyEmail />} 
          />
          <Route 
            path="/" 
            element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />} 
          />
        </Routes>
      </BrowserRouter>
      
      {showPasswordPrompt && (
        <PasswordPrompt
          onSubmit={handlePasswordSubmit}
          onCancel={handlePasswordCancel}
          loading={unlocking}
        />
      )}
    </>
  );
}

export default App;
