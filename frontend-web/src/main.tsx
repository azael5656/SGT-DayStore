import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { RealtimeIoTProvider } from './hooks/useRealtimeIoT';
import { ThemeProvider } from './theme/ThemeProvider';
import { ConfirmProvider } from './components/ui/ConfirmProvider';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/inter';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <AuthProvider>
            <RealtimeIoTProvider>
              <App />
            </RealtimeIoTProvider>
          </AuthProvider>
        </BrowserRouter>
      </ConfirmProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
