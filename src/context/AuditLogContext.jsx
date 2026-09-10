import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const AuditLogContext = createContext();

export const AuditLogProvider = ({ children }) => {
  const auth = useAuth();
  const user = auth ? auth.user : null;
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshLogs = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      setAuditLogs([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('[AUDIT] Could not fetch audit trail:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  // Client-side helper (logs are created authoritatively on the backend by API endpoints)
  const logAction = (entry) => {
    // Optimistic append in UI
    const optimistic = {
      id: `local-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    setAuditLogs(prev => [optimistic, ...prev]);
  };

  return (
    <AuditLogContext.Provider value={{ auditLogs, logAction, refreshLogs, loading }}>
      {children}
    </AuditLogContext.Provider>
  );
};

export const useAuditLog = () => useContext(AuditLogContext);
