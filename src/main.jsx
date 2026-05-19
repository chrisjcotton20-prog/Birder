import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

// Register the service worker with an explicit auto-update flow. With plain
// `registerType: 'autoUpdate'`, a freshly deployed bundle installs in the
// background but the *currently running* page keeps executing the old cached
// JS until it is manually reloaded — which is why a code fix can appear to
// "not take" after a deploy. Forcing a one-time reload as soon as the new
// service worker is ready makes deploys reliably take effect.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (!sessionStorage.getItem('sw-reloaded')) {
      sessionStorage.setItem('sw-reloaded', '1');
      updateSW(true); // activate waiting SW + reload the page once
    }
  },
  onOfflineReady() {},
});

// Clear the one-shot reload guard when the new SW takes control, so future
// deploys can each trigger their own single reload.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    sessionStorage.removeItem('sw-reloaded');
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
