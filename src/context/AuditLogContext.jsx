import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const AuditLogContext = createContext();

export const AuditLogProvider = ({ children }) => {
  const auth = useAuth();
  const user = auth ? auth.user : null;
  const [auditLogs, setAuditLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 200, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const refreshLogs = useCallback(async (targetPage = page) => {
    if (!user || user.role !== 'admin') {
      setAuditLogs([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?page=${targetPage}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err) {
      console.warn('[AUDIT] Could not fetch audit trail:', err);
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  useEffect(() => {
    refreshLogs(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page]);

  const goToPage = (n) => {
    const clamped = Math.min(Math.max(1, n), pagination.totalPages || 1);
    setPage(clamped);
  };

  // Client-side helper (logs are created authoritatively on the backend by API endpoints)
  const logAction = (entry) => {
    const optimistic = {
      id: `local-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    setAuditLogs((prev) => [optimistic, ...prev]);
  };

  return (
    <AuditLogContext.Provider value={{ auditLogs, logAction, refreshLogs, loading, pagination, page, goToPage }}>
      {children}
    </AuditLogContext.Provider>
  );
};

export const useAuditLog = () => useContext(AuditLogContext);
