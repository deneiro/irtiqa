import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';
// Per-feature stylesheets. Split out of the single 2000-line styles.css so a change
// to one surface can't collide with a change to another; load order is after the
// base so these can override it.
import './styles/nav.css';
import './styles/dashboard.css';
import './styles/dayone.css';
import './styles/templates.css';
import './styles/finances.css';
import './styles/social.css';
import './styles/calendar.css';
import './styles/achievements.css';
import './styles/market.css';
import './styles/tutorial.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// PWA: offline shell + installability. Production only — a SW in dev fights HMR.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support is progressive enhancement — never block the app on it */
    });
  });
}
