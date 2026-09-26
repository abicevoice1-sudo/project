import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css'; // Import global styles
import './styles/premium.css'; // Premium design layer

// SPA navigations should always start at the top — no browser scroll restoration jumps
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// Mark JS as running for the fail-safe reveal system: the hidden initial
// state in CSS only applies when this class exists. If this module never
// executes, content stays visible.
document.documentElement.classList.add('js');

// Installable app shell (PWA). Registered only in secure contexts and never in
// dev, so a stale shell can't mask local code changes.
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline shell is a bonus, not a requirement */ });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);