import React, { useState, useEffect, useCallback } from 'react';
import { Users, Trash2, UserPlus, Upload, Eye, RefreshCw, CheckCircle, XCircle, AlertTriangle, X, LogOut } from 'lucide-react';
import axios from 'axios';
import AddUserModal from './AddUserModal';
import BulkUploadModal from './BulkUploadModal';
import usePolling from '../../hooks/usePolling';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const POLL_MS = 20_000;

const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 20px', borderRadius: '12px', minWidth: '280px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      backgroundColor: type === 'success' ? '#f0fdf4' : type === 'error' ? '#fef2f2' : '#fffbeb',
      border: `1px solid ${type === 'success' ? '#bbf7d0' : type === 'error' ? '#fecaca' : '#fde68a'}`,
      animation: 'slideIn 0.3s ease',
    }}>
      {type === 'success' && <CheckCircle size={20} color="#16a34a" />}
      {type === 'error'   && <XCircle     size={20} color="#dc2626" />}
      {type === 'warn'    && <AlertTriangle size={20} color="#d97706" />}
      <span style={{ fontSize: '0.88rem', fontWeight: '500', flex: 1,
        color: type === 'success' ? '#15803d' : type === 'error' ? '#dc2626' : '#92400e' }}>
        {message}
      </span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '1.1rem', lineHeight: 1,
        color: type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#d97706' }}>×</button>
    </div>
  );
};

const ConfirmDialog = ({ isOpen, username, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998,
      backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '16px',
        padding: '28px', maxWidth: '360px', width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        border: '1px solid var(--border-color)', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%',
          backgroundColor: 'rgba(239,68,68,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px' }}>
          <Trash2 size={24} color="#ef4444" />
        </div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>Delete User</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', opacity: 0.6, marginBottom: 24 }}>
          Are you sure you want to delete <br />
          <strong style={{ color: 'var(--text-main)', opacity: 1 }}>"{username}"</strong>?
          <br />This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
            backgroundColor: 'transparent', border: '1px solid var(--border-color)',
            color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 500 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
            backgroundColor: '#ef4444', border: 'none', color: 'white', fontSize: '0.88rem', fontWeight: 600 }}>Delete</button>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ active }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: '0.72rem', fontWeight: 600, padding: '3px 9px', borderRadius: 20,
    color: active ? '#16a34a' : '#94a3b8',
    backgroundColor: active ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
  }}>
    <span style={{
      width: 7, height: 7, borderRadius: '50%',
      backgroundColor: active ? '#22c55e' : '#94a3b8',
      display: 'inline-block',
      animation: active ? 'pulse 2s infinite' : 'none',
    }} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const UserManagement = ({ isOpen, onClose }) => {
  const [users, setUsers]                   = useState([]);
  const [activeSessions, setActiveSessions] = useState(new Set());
  const [loading, setLoading]               = useState(true);
  const [showAddUser, setShowAddUser]       = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [deletingId, setDeletingId]         = useState(null);
  const [forcingOutId, setForcingOutId]     = useState(null);
  const [toast, setToast]                   = useState({ message: '', type: '' });
  const [confirmDialog, setConfirmDialog]   = useState({ isOpen: false, id: null, username: '' });

  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), duration);
  };

  const fetchActiveSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/auth/sessions`);
      const sessions = Array.isArray(res.data) ? res.data : [];
      const ids = new Set(
        sessions.filter(s => s.status === 'Active').map(s => s.userId?._id || s.userId).filter(Boolean)
      );
      setActiveSessions(ids);
    } catch { /* silent */ }
  }, []);

  const fetchUsers = useCallback(async ({ silent = false } = {}) => {
    if (!isOpen) return;
    try {
      if (!silent) setLoading(true);
      const res = await axios.get(`${API}/api/admin/users`);
      // Only non-admin users shown here
      const nonAdmins = Array.isArray(res.data) ? res.data.filter(u => u.role !== 'admin') : [];
      setUsers(nonAdmins);
      await fetchActiveSessions();
    } catch (err) {
      console.error('Failed to fetch users:', err);
      if (!silent) showToast('Failed to fetch users', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isOpen, fetchActiveSessions]);

  useEffect(() => { if (isOpen) fetchUsers(); }, [isOpen, fetchUsers]);
  usePolling(() => fetchUsers({ silent: true }), POLL_MS, isOpen);

  const handleDelete = (id, username) => setConfirmDialog({ isOpen: true, id, username });

  const confirmDelete = async () => {
    const { id, username } = confirmDialog;
    setConfirmDialog({ isOpen: false, id: null, username: '' });
    setDeletingId(id);
    setUsers(prev => prev.filter(u => u._id !== id));
    try {
      await axios.delete(`${API}/api/admin/users/${id}`);
      showToast(`"${username}" deleted successfully`, 'success');
    } catch {
      showToast('Failed to delete user', 'error');
      fetchUsers();
    } finally {
      setDeletingId(null);
    }
  };

  const handleForceLogout = async (id, username) => {
    setForcingOutId(id);
    try {
      const { data } = await axios.post(`${API}/api/admin/users/${id}/force-logout`);
      showToast(`"${username}" logged out (${data.sessionsEnded} session${data.sessionsEnded !== 1 ? 's' : ''} ended)`, 'success');
      await fetchActiveSessions();
    } catch {
      showToast('Force logout failed', 'error');
    } finally {
      setForcingOutId(null);
    }
  };

  if (!isOpen) return null;

  const activeCount = users.filter(u => activeSessions.has(u._id)).length;

  return (
    <>
      <style>{`
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        .um-close-btn:hover { opacity: 1 !important; }
        .um-delete-btn:hover { opacity: 1 !important; background: rgba(239,68,68,0.08) !important; }
        .um-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; padding-right: 50px; }
        @media (max-width: 480px) {
          .um-header { justify-content: flex-start; padding-right: 50px; }
          .um-header h2 { font-size: 1.1rem; }
          .um-buttons { width: 100%; display: flex; gap: 8px; flex-wrap: wrap; }
        }
      `}</style>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <ConfirmDialog isOpen={confirmDialog.isOpen} username={confirmDialog.username}
        onConfirm={confirmDelete} onCancel={() => setConfirmDialog({ isOpen: false, id: null, username: '' })} />

      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 100, padding: '20px' }}>
        <div className="glass" style={{ width: '100%', maxWidth: '650px', maxHeight: '85vh',
          display: 'flex', flexDirection: 'column', padding: '30px',
          position: 'relative', backgroundColor: 'var(--sidebar-bg)' }}>

          {/* ✅ Top-right X close button */}
          <button className="um-close-btn" onClick={onClose} title="Close"
            style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32,
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--card-bg)', border: '1px solid var(--border-color)',
              color: 'var(--text-main)', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.15s' }}>
            <X size={15} />
          </button>

          {/* Header */}
          <div className="um-header">
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 12,
              color: 'var(--text-main)', margin: 0 }}>
              <Users size={24} color="var(--primary)" /> Manage Users
            </h2>
            <div className="um-buttons" style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => fetchUsers()}
                style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 5,
                  backgroundColor: 'transparent', border: '1px solid var(--border-color)',
                  color: 'var(--text-main)', borderRadius: 8, cursor: 'pointer' }} title="Refresh">
                <RefreshCw size={14} />
              </button>
              <button onClick={() => setShowBulkUpload(true)} className="glass"
                style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6,
                  backgroundColor: 'rgba(37,99,235,0.08)', border: '1px solid var(--border-color)',
                  color: 'var(--text-main)', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                <Upload size={15} /> Bulk Upload
              </button>
              <button onClick={() => setShowAddUser(true)}
                style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6,
                  backgroundColor: 'var(--primary)', border: 'none', color: 'white',
                  borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                <UserPlus size={15} /> Add User
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', opacity: 0.5, margin: 0 }}>
              {users.length} user{users.length !== 1 ? 's' : ''}
            </p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e',
                display: 'inline-block', animation: 'pulse 2s infinite' }} />
              {activeCount} online
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
              {users.length - activeCount} offline
            </span>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-main)', opacity: 0.4, marginTop: 40 }}>
                Loading users...
              </p>
            ) : users.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-main)', opacity: 0.4, marginTop: 40 }}>
                No users found.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.map(u => {
                  const isActive = activeSessions.has(u._id);
                  const canForceLogout = isActive;
                  return (
                    <div key={u._id} className="glass"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderRadius: 10, backgroundColor: 'var(--card-bg)',
                        border: `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : 'var(--border-color)'}`,
                        opacity: deletingId === u._id ? 0.4 : 1, transition: 'opacity 0.2s',
                        boxShadow: isActive ? '0 0 0 1px rgba(34,197,94,0.08)' : 'none' }}>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Avatar + presence dot */}
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10,
                            backgroundColor: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(37,99,235,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.9rem',
                            color: isActive ? '#16a34a' : 'var(--primary)' }}>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ position: 'absolute', bottom: -1, right: -1,
                            width: 10, height: 10, borderRadius: '50%',
                            backgroundColor: isActive ? '#22c55e' : '#94a3b8',
                            border: '2px solid var(--card-bg)' }} />
                        </div>
                        <div>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                            {u.username}
                          </p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-main)', opacity: 0.45, margin: 0 }}>
                            {u.mustChangePassword ? 'Awaiting first login' : 'Registered'}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <StatusBadge active={isActive} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                          borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: 'rgba(100,100,100,0.1)',
                          color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                          <Eye size={11} /> {u.role}
                        </div>
                        {canForceLogout && (
                          <button className="um-delete-btn"
                            onClick={() => handleForceLogout(u._id, u.username)}
                            disabled={forcingOutId === u._id}
                            title="Force logout this user"
                            style={{ display: 'flex', alignItems: 'center', gap: 5,
                              padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                              background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)',
                              color: '#f97316', fontSize: '0.72rem', fontWeight: 700,
                              opacity: forcingOutId === u._id ? 0.5 : 1, transition: '0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background='rgba(249,115,22,0.15)'; e.currentTarget.style.borderColor='#f97316'; }}
                            onMouseLeave={e => { e.currentTarget.style.background='rgba(249,115,22,0.08)'; e.currentTarget.style.borderColor='rgba(249,115,22,0.3)'; }}>
                            <LogOut size={12}/>
                            {forcingOutId === u._id ? 'Logging out…' : 'Force Logout'}
                          </button>
                        )}
                        <button className="um-delete-btn"
                          onClick={() => handleDelete(u._id, u.username)}
                          disabled={deletingId === u._id}
                          title="Delete user"
                          style={{ background: 'none', border: 'none', cursor: 'pointer',
                            color: '#ef4444', opacity: 0.6, padding: '5px 6px', borderRadius: 6,
                            transition: 'opacity 0.15s, background 0.15s' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Close button */}
          <button className="um-close-btn" onClick={onClose}
            style={{ marginTop: 20, padding: '11px', width: '100%',
              backgroundColor: 'transparent', border: '1px solid var(--border-color)',
              borderRadius: 8, color: 'var(--text-main)', cursor: 'pointer',
              fontSize: '0.9rem', opacity: 0.65, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, transition: 'opacity 0.15s' }}>
            <X size={15} /> Close
          </button>
        </div>

        {showAddUser && (
          <AddUserModal isOpen={showAddUser} onClose={() => setShowAddUser(false)}
            onSuccess={() => { fetchUsers(); showToast('User added successfully', 'success'); }} />
        )}
        {showBulkUpload && (
          <BulkUploadModal isOpen={showBulkUpload} onClose={() => setShowBulkUpload(false)}
            onSuccess={() => { fetchUsers(); showToast('Bulk upload successful', 'success'); }} />
        )}
      </div>
    </>
  );
};

export default UserManagement;