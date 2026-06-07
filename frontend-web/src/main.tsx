import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { RealtimeIoTProvider } from './hooks/useRealtimeIoT';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RealtimeIoTProvider>
          <App />
        </RealtimeIoTProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
