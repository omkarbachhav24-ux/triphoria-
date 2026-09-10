import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

import { AuditLogProvider } from './context/AuditLogContext';
import { AuthProvider } from './context/AuthContext';
import { OrderProvider } from './context/OrderContext';
import { CMSProvider } from './context/CMSContext';
import { CursorProvider } from './context/CursorContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AuditLogProvider>
        <OrderProvider>
          <CMSProvider>
            <CursorProvider>
              <App />
            </CursorProvider>
          </CMSProvider>
        </OrderProvider>
      </AuditLogProvider>
    </AuthProvider>
  </React.StrictMode>
);
