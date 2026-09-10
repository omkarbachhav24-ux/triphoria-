import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export const STATE_EXPLANATIONS = {
  'Pending Approval': 'Order brief and media assets have been submitted and are awaiting operational verification.',
  'In Progress': 'Lead editor has been assigned and is actively constructing the cut.',
  'Review': 'Authoritative master deliverable has been uploaded and is waiting for final approval.',
  'Completed': 'Delivery approved. Final ProRes/4K assets are available and 14-day retention buffer is active.',
  'Rejected': 'Order was reviewed and declined by studio administration with formal reason.'
};

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const auth = useAuth();
  const user = auth ? auth.user : null;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch scoped orders from backend API
  const refreshOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/orders', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.warn('[ORDERS] Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  // Create Order (with Idempotency Token)
  const createOrder = async (orderData) => {
    const idempotencyKey = orderData.idempotencyToken || `idem-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': idempotencyKey
        },
        credentials: 'include',
        body: JSON.stringify({ ...orderData, idempotencyToken: idempotencyKey })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await refreshOrders();
        return data.order;
      } else {
        throw new Error(data.error || 'Failed to submit order');
      }
    } catch (err) {
      console.error('[CREATE ORDER ERROR]', err);
      throw err;
    }
  };

  // Admin approves order: Pending Approval -> In Progress
  const approveOrder = async (orderId, editorId, adminNotes = '') => {
    try {
      const res = await fetch(`/api/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ editorId, adminNotes })
      });

      const data = await res.json();
      if (res.ok) {
        await refreshOrders();
        return { success: true };
      } else {
        alert(data.error || 'Failed to approve order');
        return { success: false, message: data.error };
      }
    } catch (err) {
      alert('Network error while approving order');
      return { success: false };
    }
  };

  // Admin rejects order: Pending Approval -> Rejected
  const rejectOrder = async (orderId, rejectionReason) => {
    if (!rejectionReason || !rejectionReason.trim()) {
      alert('A valid rejection reason is required.');
      return { success: false };
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rejectionReason })
      });

      const data = await res.json();
      if (res.ok) {
        await refreshOrders();
        return { success: true };
      } else {
        alert(data.error || 'Failed to reject order');
        return { success: false };
      }
    } catch (err) {
      alert('Network error while rejecting order');
      return { success: false };
    }
  };

  // Admin reassigns editor
  const reassignEditor = async (orderId, newEditorId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newEditorId })
      });

      const data = await res.json();
      if (res.ok) {
        await refreshOrders();
        return { success: true };
      } else {
        alert(data.error || 'Failed to reassign editor');
        return { success: false };
      }
    } catch (err) {
      alert('Network error while reassigning editor');
      return { success: false };
    }
  };

  // Editor uploads output: In Progress -> Review
  const uploadEditorOutput = async (orderId, outputData) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(outputData)
      });

      const data = await res.json();
      if (res.ok) {
        await refreshOrders();
        return { success: true };
      } else {
        alert(data.error || 'Failed to record deliverable cut');
        return { success: false };
      }
    } catch (err) {
      alert('Network error while uploading output cut');
      return { success: false };
    }
  };

  // Admin approves final delivery: Review -> Completed with 14-Day Storage Retention
  const approveFinalDelivery = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        await refreshOrders();
        return { success: true };
      } else {
        alert(data.error || 'Failed to approve final delivery');
        return { success: false };
      }
    } catch (err) {
      alert('Network error while approving delivery');
      return { success: false };
    }
  };

  // Customer or Admin requests revision: Review -> In Progress
  const requestRevision = async (orderId, revisionNotes) => {
    if (!revisionNotes || !revisionNotes.trim()) {
      alert('Revision notes are required.');
      return { success: false };
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ revisionNotes })
      });

      const data = await res.json();
      if (res.ok) {
        await refreshOrders();
        return { success: true };
      } else {
        alert(data.error || 'Failed to request revision');
        return { success: false };
      }
    } catch (err) {
      alert('Network error while requesting revision');
      return { success: false };
    }
  };

  // Storage Governance: Soft-Delete
  const softDeleteStorage = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/storage/soft-delete`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) await refreshOrders();
    } catch (err) {
      console.error(err);
    }
  };

  // Storage Governance: Restore
  const restoreStorage = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/storage/restore`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) await refreshOrders();
    } catch (err) {
      console.error(err);
    }
  };

  // Storage Governance: Purge
  const purgeStorage = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/storage/purge`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) await refreshOrders();
    } catch (err) {
      console.error(err);
    }
  };

  // Download Handler: Requests short-lived signed URL and opens
  const trackDownload = async (orderId, outputId, filename, storageKey) => {
    try {
      const key = storageKey || `outputs/${orderId}/${filename || 'master.mp4'}`;
      const res = await fetch(`/api/storage/authorize-download?orderId=${orderId}&storageKey=${encodeURIComponent(key)}&filename=${encodeURIComponent(filename || 'master.mp4')}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
          return;
        }
      }
    } catch (err) {
      console.warn('Fallback download');
    }
    // Fallback if URL is external
    if (storageKey?.startsWith('http')) {
      window.open(storageKey, '_blank');
    }
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        createOrder,
        approveOrder,
        rejectOrder,
        reassignEditor,
        uploadEditorOutput,
        approveFinalDelivery,
        requestRevision,
        softDeleteStorage,
        restoreStorage,
        purgeStorage,
        trackDownload,
        getOrderById: (id) => orders.find(o => o.id === id),
        refreshOrders
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => useContext(OrderContext);
