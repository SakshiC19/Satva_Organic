import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress benign ResizeObserver loop errors during development
if (process.env.NODE_ENV === 'development') {
    const resizeObserverError = 'ResizeObserver loop completed with undelivered notifications.';
    window.addEventListener('error', (e) => {
        if (e.message === resizeObserverError || e.message === 'ResizeObserver loop limit exceeded') {
            const resizeObserverErrGuid = 'window.onerror - ResizeObserver loop limit exceeded';
            if (!window[resizeObserverErrGuid]) {
                window[resizeObserverErrGuid] = true;
                e.stopImmediatePropagation();
            }
        }
    });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
