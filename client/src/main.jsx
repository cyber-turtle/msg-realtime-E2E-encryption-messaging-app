import './polyfills';
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App.jsx'

// Disable console logs in production
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  console.warn = () => {};
}

createRoot(document.getElementById('root')).render(
  <App />
)
