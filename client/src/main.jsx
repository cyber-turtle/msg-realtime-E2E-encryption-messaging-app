import './polyfills';
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App.jsx'

// Re-enable console logs in production for mobile debugging
if (import.meta.env.PROD) {
  // Add error alert for mobile debugging
  window.onerror = function(msg, url, line, col, error) {
    alert(`ERR: ${msg}\nL:${line}\nC:${col}`);
    return false;
  };
}

createRoot(document.getElementById('root')).render(
  <App />
)
