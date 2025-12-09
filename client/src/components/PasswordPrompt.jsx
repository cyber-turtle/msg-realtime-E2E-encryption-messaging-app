import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const PasswordPrompt = ({ onSubmit, onCancel, loading = false }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal password-prompt-modal">
        <h3>Enter Your Password</h3>
        <p>Please enter your password to decrypt your private key and restore your chat session.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="form-input"
              autoFocus
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="btn-toggle-password"
              disabled={loading}
            >
              {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </button>
          </div>
          
          <div className="modal-actions">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!password.trim() || loading}
            >
              {loading ? 'Decrypting...' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordPrompt;