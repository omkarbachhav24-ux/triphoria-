import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [editors, setEditors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize session from server cookie on load
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn('[AUTH] Could not verify session with server:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Fetch active editors list from database
  const refreshEditors = async () => {
    try {
      const res = await fetch('/api/auth/editors', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEditors(data.editors || []);
      }
    } catch (err) {
      console.warn('[AUTH] Could not fetch editors list:', err);
    }
  };

  useEffect(() => {
    refreshEditors();
  }, [user]);

  // Real backend login (sets HttpOnly cookie)
  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        await refreshEditors();
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.error || 'Authentication failed' };
      }
    } catch (err) {
      return { success: false, message: 'Server communication failure. Please check server.' };
    }
  };

  // Real backend client registration
  const register = async (name, email, password, organization = '') => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, organization })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        await refreshEditors();
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.error || 'Registration failed' };
      }
    } catch (err) {
      return { success: false, message: 'Server communication failure. Please check server.' };
    }
  };

  // Real backend logout (clears session and cookie)
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.warn('[AUTH] Logout request error:', err);
    } finally {
      setUser(null);
    }
  };

  // Quick switch role utility (authenticates with real server credentials to obtain valid session)
  const switchRole = async (roleType, specificId = null) => {
    if (roleType === 'admin') {
      return await login('admin@triphoria.io', 'adminpgt');
    }
    if (roleType === 'editor') {
      const targetEmail = specificId === 'editor-02' ? 'elena@triphoria.io' : 'marcus@triphoria.io';
      return await login(targetEmail, 'editorpgt');
    }
    if (roleType === 'client' || roleType === 'customer') {
      return await login('alex@creator.com', 'clientpgt');
    }
    return { success: false };
  };

  // Dynamic Editor Onboarding by Super Admin (persisted in SQLite)
  const addEditor = async (editorData) => {
    try {
      const res = await fetch('/api/auth/editors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editorData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await refreshEditors();
        return data.editor;
      } else {
        throw new Error(data.error || 'Failed to onboard editor');
      }
    } catch (err) {
      alert(err.message);
      throw err;
    }
  };

  // Deactivate Editor
  const deleteEditor = async (id) => {
    try {
      const res = await fetch(`/api/auth/editors/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        await refreshEditors();
        return true;
      } else {
        alert(data.error || 'Failed to deactivate editor');
        return false;
      }
    } catch (err) {
      alert('Failed to deactivate editor');
      return false;
    }
  };

  const generateEditorPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TP-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const canAccessOrder = (currentUser, order) => {
    if (!currentUser || !order) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'editor') return order.assignedEditorId === currentUser.id;
    return order.userId === currentUser.id;
  };

  const canPerformAction = (currentUser, action, order = null) => {
    if (!currentUser) return false;
    switch (action) {
      case 'create_order':
        return currentUser.role === 'customer' || currentUser.role === 'client' || currentUser.role === 'admin';
      case 'approve_order':
      case 'reject_order':
      case 'assign_editor':
      case 'manage_storage':
      case 'approve_final_delivery':
      case 'onboard_editor':
        return currentUser.role === 'admin';
      case 'upload_output':
        return currentUser.role === 'editor' && order && order.assignedEditorId === currentUser.id;
      case 'download_final':
        if (currentUser.role === 'admin') return true;
        if (currentUser.role === 'customer' || currentUser.role === 'client') {
          return order && order.status === 'Completed' && canAccessOrder(currentUser, order);
        }
        return false;
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        editors,
        loading,
        login,
        register,
        logout,
        switchRole,
        addEditor,
        deleteEditor,
        generateEditorPassword,
        refreshEditors,
        canAccessOrder,
        canPerformAction
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
