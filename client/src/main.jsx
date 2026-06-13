import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [resource, config] = args;
  const newConfig = config || {};
  newConfig.headers = { ...newConfig.headers };
  const pass = localStorage.getItem('focuslog_password');
  if (pass) {
    newConfig.headers['x-focuslog-password'] = pass;
  }
  const response = await originalFetch(resource, newConfig);
  if (response.status === 401 && !(typeof resource === 'string' && resource.includes('/api/auth'))) {
    window.dispatchEvent(new Event('focuslog-unauthorized'));
  }
  return response;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
