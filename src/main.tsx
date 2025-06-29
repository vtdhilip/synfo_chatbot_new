import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext'; // <-- Import AuthProvider
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider> {/* <-- Wrap your App component */}
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
