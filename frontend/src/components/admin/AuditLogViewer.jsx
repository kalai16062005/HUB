import React, { useState, useEffect } from 'react';
import { X, Shield, User, Globe, LogIn, LogOut, AlertTriangle, RefreshCw, Filter, Trash2 } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

const ACTION_CONFIG = {
  USER_CREATED:  { label: 'User Created',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',  icon: User },
  USER_DELETED:  { label: 'User Deleted',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  icon: User },
  URL_ADDED:     { label: 'URL Added',     color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.25)',  icon: Globe },
  URL_DELETED:   { label: 'URL Deleted',   color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)', icon: Globe },
  URL_UPDATED:   { label: 'URL Updated',   color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.25)', icon: Globe },
  LOGIN_SUCCESS: { label: 'Login',         color: '#0891b2', bg: 'rgba(8,145,178,0.1)',   border: 'rgba(8,145,178,0.25)',  icon: LogIn },
  LOGIN_FAILED:  { label: 'Login Failed',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  icon: AlertTriangle },
  LOGOUT:        { label: 'Logout',        color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)', icon: LogOut },
};

const FILTER_KEYS = ['ALL','USER_CREATED','USER_DELETED','URL_ADDED','URL_DELETED','URL_UPDATED','LOGIN_SUCCESS','LOGIN_FAILED','LOGOUT'];

const formatTime = (dateStr) => new Date(dateStr).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
});

// ── Custom Confirm Dialog (replaces window.confirm) ────────────────────────
const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, danger = true }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)',
        borderRadius: 20, padding: 32, maxWidth: 400, width: '100%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.25)', textAlign: 'center',
        animation: 'alSlideIn 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px',
          background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.1)',
          border: `1px solid ${danger ? 'rgba(239,68,68,0.25)' : 'rgba(37,99,235,0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trash2 size={24} color={danger ? '#ef4444' : '#2563eb'} />
        </div>

        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 10px',
          fontFamily: "'Outfit', sans-serif" }}>{title}</h3>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', opacity: 0.55,
          margin: '0 0 28px', lineHeight: 1.6 }}>{message}</p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: '11px', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 600,
              transition: '0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--card-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: '11px', borderRadius: 10, cursor: 'pointer',
              background: danger
                ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              border: 'none', color: 'white', fontSize: '0.88rem', fontWeight: 700,
              boxShadow: danger ? '0 4px 16px rgba(239,68,68,0.3)' : '0 4px 16px rgba(37,99,235,0.3)',
              transition: '0.15s' }}>
            {danger ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
const AuditLogViewer = ({ isOpen, onClose }) => {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  // Confirm dialog state
  const [confirm, setConfirm] = useState({
    open: false, title: '', message: '', onConfirm: null,
  });

  const showConfirm = (title, message, onConfirm) => {
    setConfirm({ open: true, title, message, onConfirm });
  };
  const closeConfirm = () => setConfirm({ open: false, title: '', message: '', onConfirm: null });

  const fetchLogs = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const res = await axios.get(`${API}/api/admin/audit-logs`);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch { setLogs([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const clearAllLogs = () => {
    showConfirm(
      'Clear All Logs',
      'This will permanently delete all 137 audit log entries. This action cannot be undone.',
      async () => {
        closeConfirm();
        try {
          await axios.delete(`${API}/api/admin/audit-logs`);
          setLogs([]);
        } catch (err) { console.error(err); }
      }
    );
  };

  const deleteLog = (id) => {
    showConfirm(
      'Delete Log Entry',
      'Are you sure you want to delete this log entry?',
      async () => {
        closeConfirm();
        try {
          await axios.delete(`${API}/api/admin/audit-logs/${id}`);
          setLogs(prev => prev.filter(l => l._id !== id));
        } catch (err) { console.error(err); }
      }
    );
  };

  useEffect(() => { if (isOpen) fetchLogs(); }, [isOpen]);
  if (!isOpen) return null;

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.action === filter);
  const counts = logs.reduce((acc, l) => { acc[l.action] = (acc[l.action] || 0) + 1; return acc; }, {});

  return (
    <>
      <style>{`
        @keyframes alSlideIn { from{opacity:0;transform:translateY(12px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes alSpin    { to { transform: rotate(360deg); } }
        .al-modal    { animation: alSlideIn 0.25s cubic-bezier(0.4,0,0.2,1); }
        .al-close:hover { opacity: 1 !important; }
        .al-row:hover { background: rgba(37,99,235,0.015) !important; }
        .al-del:hover { opacity: 1 !important; }
      `}</style>

      {/* Custom confirm dialog — no browser popup */}
      <ConfirmDialog
        isOpen={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={closeConfirm}
        danger={true}
      />

      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: '20px' }}>
        <div className="al-modal" style={{
          width: '100%', maxWidth: '820px', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          borderRadius: 20, overflow: 'hidden',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(226,232,240,0.9)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.15)',
        }}>
          {/* Accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg,#2563eb,#7c3aed,#0891b2)', flexShrink: 0 }} />

          {/* Header */}
          <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid rgba(226,232,240,0.8)', flexShrink: 0,
            background: 'linear-gradient(135deg,rgba(37,99,235,0.03),rgba(255,255,255,0))' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0,
                display: 'flex', alignItems: 'center', gap: 12, fontFamily: "'Outfit', sans-serif" }}>
                <div style={{ width: 40, height: 40, borderRadius: 11,
                  background: 'linear-gradient(135deg,rgba(37,99,235,0.12),rgba(37,99,235,0.06))',
                  border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(37,99,235,0.1)' }}>
                  <Shield size={20} color="#2563eb" />
                </div>
                Audit Logs
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                  background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }}>
                  {logs.length}
                </span>
              </h2>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Clear All button */}
                <button onClick={clearAllLogs}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                    borderRadius: 9, background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: '0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor='#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.25)'; }}>
                  <Trash2 size={13} /> Clear All
                </button>

                <button onClick={() => fetchLogs(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                    borderRadius: 9, background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(226,232,240,0.9)',
                    color: '#475569', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: '0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.color='var(--primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(226,232,240,0.9)'; e.currentTarget.style.color='#475569'; }}>
                  <RefreshCw size={13} style={{ animation: refreshing ? 'alSpin 1s linear infinite' : 'none' }} />
                  Refresh
                </button>

                <button className="al-close" onClick={onClose} title="Close"
                  style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(241,245,249,0.9)', border: '1px solid rgba(226,232,240,0.9)',
                    color: '#64748b', cursor: 'pointer', opacity: 0.75, transition: 'opacity 0.15s' }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Summary badges */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
              {Object.entries(ACTION_CONFIG).map(([action, cfg]) =>
                counts[action] ? (
                  <div key={action} onClick={() => setFilter(filter === action ? 'ALL' : action)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px',
                      borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                      background: filter === action ? cfg.bg : 'rgba(248,250,252,0.9)',
                      border: `1px solid ${filter === action ? cfg.border : 'rgba(226,232,240,0.8)'}`,
                      color: filter === action ? cfg.color : '#64748b',
                      cursor: 'pointer', transition: 'all 0.15s' }}>
                    {cfg.label} · {counts[action]}
                  </div>
                ) : null
              )}
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              <Filter size={12} color="#94a3b8" />
              {FILTER_KEYS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '4px 11px', borderRadius: 8, fontSize: '0.73rem', fontWeight: 600,
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                    opacity: filter === f ? 1 : 0.55,
                    background: filter === f ? '#2563eb' : 'rgba(241,245,249,0.9)',
                    color: filter === f ? 'white' : '#475569' }}>
                  {f === 'ALL' ? 'All' : ACTION_CONFIG[f]?.label}
                </button>
              ))}
              {filter !== 'ALL' && (
                <button onClick={() => setFilter('ALL')}
                  style={{ padding: '4px 10px', borderRadius: 8, fontSize: '0.73rem', fontWeight: 700,
                    cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.07)', color: '#ef4444' }}>
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {/* Count */}
          <div style={{ padding: '10px 28px 6px', flexShrink: 0 }}>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, fontWeight: 500 }}>
              Showing <strong style={{ color: '#475569' }}>{filteredLogs.length}</strong> of <strong style={{ color: '#475569' }}>{logs.length}</strong> entries
            </p>
          </div>

          {/* Log list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                <RefreshCw size={18} style={{ animation: 'alSpin 1s linear infinite', marginBottom: 10 }} />
                <p style={{ fontSize: '0.85rem', margin: 0 }}>Loading logs…</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                <Shield size={28} style={{ opacity: 0.25, marginBottom: 10 }} />
                <p style={{ fontSize: '0.85rem', margin: 0 }}>No logs found.</p>
              </div>
            ) : filteredLogs.map((log, i) => {
              const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG['LOGIN_SUCCESS'];
              const Icon = cfg.icon;
              return (
                <div key={log._id || i} className="al-row"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                    borderRadius: 12, background: 'rgba(248,250,252,0.7)',
                    border: `1px solid ${cfg.border}`, transition: '0.12s' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} color={cfg.color} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: cfg.color,
                        letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {cfg.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {formatTime(log.createdAt)}
                        </span>
                        {/* Single delete button */}
                        <button className="al-del" onClick={() => deleteLog(log._id)}
                          title="Delete this log"
                          style={{ background: 'none', border: 'none', color: '#ef4444',
                            cursor: 'pointer', opacity: 0.25, padding: '2px 4px',
                            borderRadius: 5, display: 'flex', transition: '0.15s' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.86rem', color: '#0f172a', margin: '0 0 5px', fontWeight: 500 }}>
                      {log.details}
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {log.performedBy?.username && (
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 20, background: 'rgba(241,245,249,0.8)',
                          border: '1px solid rgba(226,232,240,0.8)' }}>
                          <User size={9} /> {log.performedBy.username}
                        </span>
                      )}
                      {log.target?.name && log.target.name !== log.performedBy?.username && (
                        <span style={{ fontSize: '0.7rem', color: '#64748b', padding: '2px 8px', borderRadius: 20,
                          background: 'rgba(241,245,249,0.8)', border: '1px solid rgba(226,232,240,0.8)' }}>
                          → {log.target.name}
                        </span>
                      )}
                      {log.ipAddress && (
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace',
                          padding: '2px 8px', borderRadius: 20, background: 'rgba(241,245,249,0.8)',
                          border: '1px solid rgba(226,232,240,0.8)' }}>
                          {log.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(226,232,240,0.8)', flexShrink: 0,
            background: 'rgba(248,250,252,0.8)' }}>
            <button className="al-close" onClick={onClose}
              style={{ width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer',
                background: 'transparent', border: '1px solid rgba(226,232,240,0.9)',
                color: '#64748b', fontSize: '0.88rem', fontWeight: 600, opacity: 0.75, transition: '0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <X size={14} /> Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuditLogViewer;