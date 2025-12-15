import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './store/auth';
import './index.css';
import App from './App';

// PUBLIC_INTERFACE
/**
 * Application root entrypoint. Mounts the React application using React 18 root API
 * and sets up the BrowserRouter for client-side routing.
 */
const container = document.getElementById('root') as HTMLElement;
ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
