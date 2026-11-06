import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Monitor, Smartphone, Globe, ChevronDown, ChevronRight,
  ShieldCheck, RefreshCw, User, Clock, LogIn, LogOut, Trash2,
  AlertTriangle, X, Activity,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import usePolling from '../../hooks/usePolling';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const getDeviceIcon = (ua = '') => {
  const s = ua.toLowerCase();
  if (s.includes('android') || s.includes('iphone')) return <Smartphone size={14} />;
  if (s.includes('windows') || s.includes('macintosh') || s.includes('linux')) return <Monitor size={14} />;
  return <Globe size={14} />;
};

const getDeviceName = (session) => {
  const ua      = session?.deviceInfo?.userAgent || '';
  const browser = session?.deviceInfo?.browser   || '';
  const os =
    ua.includes('Windows')   ? 'Windows'  :
    ua.includes('Macintosh') ? 'Mac'       :
    ua.includes('Android')   ? 'Android'  :
    ua.includes('iPhone')    ? 'iPhone'    :
    ua.includes('Linux')     ? 'Linux'     : null;
  if (!os && !browser) return 'Unknown Device';
  if (!os)   return browser;
  if (!browser) return os;
  return `${os} · ${browser}`;
};

const getUsername = (user) => {
  if (!user) return 'Unknown';
  if (typeof user === 'string') return `User (${user.slice(0, 6)}…)`;
  return user.username || `Deleted (${user._id?.slice(0, 6) || '?'}…)`;
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr), now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

const fmtTime = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '—';

const fmtFull = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }) : '—';

const getDuration = (session) => {
  const start = new Date(session.loginTime || session.createdAt);
  const end   = session.status === 'Active' ? new Date() : new Date(session.lastActive || session.updatedAt || session.createdAt);
  const diffMs = end - start;
  if (!start || isNaN(diffMs) || diffMs < 0) return '—';
  const totalMins = Math.floor(diffMs / 60_000);
  const hrs = Math.floor(totalMins / 60), mins = totalMins % 60;
  if (totalMins === 0) return '< 1m';
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const getDayLabel = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr), now = new Date();
  const diff = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
     new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86_400_000
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const groupByUser = (sessions) => {
  const nonAdmin = sessions.filter(s => (s.userId?.role || 'user') !== 'admin');
  const map = new Map();
  nonAdmin.forEach(s => {
    const uid = s.userId?._id || s.userId || 'unknown';
    if (!map.has(uid)) map.set(uid, []);
    map.get(uid).push(s);
  });
  const result = [];
  map.forEach((userSessions, uid) => {
    userSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    result.push({ uid, userSessions, latest: userSessions[0] });
  });
  result.sort((a, b) => {
    const aA = a.latest?.status === 'Active' ? 1 : 0;
    const bA = b.latest?.status === 'Active' ? 1 : 0;
    if (bA !== aA) return bA - aA;
    return new Date(b.latest?.createdAt) - new Date(a.latest?.createdAt);
  });
  return result;
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
const DeleteModal = ({ username, onConfirm, onCancel, loading }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(2,6,23,0.60)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{
      background: '#fff', borderRadius: 20, padding: '32px 28px',
      maxWidth: 380, width: '90%',
      boxShadow: '0 24px 64px rgba(0,0,0,0.20)',
      border: '1px solid #f1f5f9', position: 'relative',
      animation: 'sh-pop .2s cubic-bezier(.22,1,.36,1)',
    }}>
      <button onClick={onCancel} style={{
        position: 'absolute', top: 14, right: 14, background: '#f8fafc',
        border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 6, borderRadius: 8,
        display: 'flex', alignItems: 'center',
      }}><X size={15} /></button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#fef2f2', padding: 10, borderRadius: 12, flexShrink: 0 }}>
          <AlertTriangle size={20} color="#dc2626" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 4 }}>
            Delete sessions?
          </div>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            All sessions for <strong style={{ color: '#0f172a' }}>{username}</strong> will be
            permanently removed and they'll be <strong style={{ color: '#dc2626' }}>logged out</strong> from every device.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: 10,
          background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: '0.84rem',
        }}>Cancel</button>
        <button onClick={onConfirm} disabled={loading} style={{
          flex: 1, padding: '10px', border: 'none', borderRadius: 10,
          background: loading ? '#fca5a5' : '#dc2626', color: 'white',
          cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.84rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'background .15s',
        }}>
          <Trash2 size={13} />{loading ? 'Deleting…' : 'Delete & Logout'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Status Pill ──────────────────────────────────────────────────────────────
const StatusPill = ({ active }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
    background: active ? '#f0fdf4' : '#f8fafc',
    color: active ? '#16a34a' : '#94a3b8',
    border: `1px solid ${active ? '#bbf7d0' : '#e2e8f0'}`,
  }}>
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: active ? '#22c55e' : '#cbd5e1',
      display: 'inline-block',
      ...(active ? { boxShadow: '0 0 0 2px #bbf7d0', animation: 'sh-pulse 2s infinite' } : {}),
    }} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, isMe }) => {
  const letter = (name || '?')[0].toUpperCase();
  const colors = [
    ['#dbeafe','#2563eb'], ['#f3e8ff','#7c3aed'], ['#fce7f3','#db2777'],
    ['#dcfce7','#16a34a'], ['#fef3c7','#d97706'],
  ];
  const idx = Math.abs([...name].reduce((a,c) => a + c.charCodeAt(0), 0)) % colors.length;
  const [bg, fg] = colors[idx];
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: '0.82rem', color: fg, flexShrink: 0,
      border: isMe ? `2px solid ${fg}` : '2px solid transparent',
    }}>{letter}</div>
  );
};

// ─── Sub-row ──────────────────────────────────────────────────────────────────
const SubRow = ({ s }) => (
  <tr style={{ background: '#fafbfd' }}>
    <td style={{ ...T.subTd, paddingLeft: 56, borderLeft: '3px solid #bfdbfe' }}>
      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#3b82f6' }}>{getDayLabel(s.createdAt)}</span>
      <br />
      <span style={{ fontSize: '0.71rem', color: '#94a3b8', fontFamily: 'monospace' }}>
        {s.ipAddress === '::1' || s.ipAddress === '127.0.0.1' ? '127.0.0.1' : (s.ipAddress || '—')}
      </span>
    </td>
    <td style={T.subTd}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '0.81rem', fontWeight: 500 }}>
        {getDeviceIcon(s?.deviceInfo?.userAgent)}{getDeviceName(s)}
      </div>
    </td>
    <td style={T.subTd}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#16a34a', fontSize: '0.81rem' }}>
        <LogIn size={11} />{fmtTime(s.createdAt)}
      </div>
    </td>
    <td style={T.subTd}>
      {s.status === 'Active'
        ? <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.78rem' }}>Still active</span>
        : <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#f43f5e', fontSize: '0.81rem' }}>
            <LogOut size={11} />{fmtTime(s.lastActive || s.updatedAt)}
          </div>}
    </td>
    <td style={{ ...T.subTd, color: '#0369a1', fontWeight: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Clock size={11} />{getDuration(s)}
      </div>
    </td>
    <td style={T.subTd}><StatusPill active={s.status === 'Active'} /></td>
    <td style={T.subTd} />
    <td style={T.subTd} />
  </tr>
);

// ─── Table styles ─────────────────────────────────────────────────────────────
const T = {
  th: {
    padding: '11px 16px', fontWeight: 700, fontSize: '0.68rem',
    textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8',
    borderBottom: '1.5px solid #f1f5f9', whiteSpace: 'nowrap',
    background: '#fafbfd', userSelect: 'none',
  },
  td: {
    padding: '0 16px', height: 64,
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle', fontSize: '0.85rem',
  },
  subTd: {
    padding: '10px 16px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle', fontSize: '0.81rem',
  },
};

// Fixed column widths for perfect alignment
const COL_WIDTHS = {
  user:     200,
  device:   190,
  login:    180,
  logout:   180,
  duration: 100,
  status:   110,
  sessions: 110,
  actions:  72,
};

// ─── Main Row ─────────────────────────────────────────────────────────────────
const UserRow = ({ uid, userSessions, latest, currentUserId, onDeleteClick }) => {
  const [expanded, setExpanded] = useState(false);
  const hasMore = userSessions.length > 1;
  const isMe    = latest?.userId?._id === currentUserId || latest?.userId === currentUserId;
  const username = getUsername(latest?.userId);
  const active   = latest?.status === 'Active';

  return (
    <>
      <tr style={{
        background: isMe ? 'rgba(37,99,235,0.025)' : 'white',
        transition: 'background .15s',
      }}
        onMouseEnter={e => { if (!isMe) e.currentTarget.style.background = '#fafbfd'; }}
        onMouseLeave={e => { if (!isMe) e.currentTarget.style.background = 'white'; }}
      >
        {/* User */}
        <td style={{ ...T.td, width: COL_WIDTHS.user }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={username} isMe={isMe} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a',
                display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>
                  {username}
                </span>
                {isMe && (
                  <span style={{
                    fontSize: '0.6rem', padding: '2px 7px', borderRadius: 8,
                    background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, flexShrink: 0,
                  }}>YOU</span>
                )}
              </div>
              <div style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 500, marginTop: 1 }}>
                {latest?.userId?.role || 'user'}
              </div>
            </div>
          </div>
        </td>

        {/* Device */}
        <td style={{ ...T.td, width: COL_WIDTHS.device }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 8,
              background: '#f1f5f9', color: '#475569', flexShrink: 0,
            }}>
              {getDeviceIcon(latest?.deviceInfo?.userAgent)}
            </span>
            <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.84rem',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
              {getDeviceName(latest)}
            </span>
          </div>
        </td>

        {/* Last Login */}
        <td style={{ ...T.td, width: COL_WIDTHS.login }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 8,
              background: '#f0fdf4', color: '#16a34a', flexShrink: 0,
            }}>
              <LogIn size={13} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.83rem', lineHeight: 1.2 }}>
                {getDayLabel(latest?.createdAt)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                {fmtFull(latest?.createdAt)}
              </div>
            </div>
          </div>
        </td>

        {/* Logged Out */}
        <td style={{ ...T.td, width: COL_WIDTHS.logout }}>
          {active ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'block',
                  boxShadow: '0 0 0 2.5px #bbf7d0', animation: 'sh-pulse 2s infinite' }} />
              </div>
              <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.83rem' }}>Still active</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 8,
                background: '#fff1f2', color: '#f43f5e', flexShrink: 0,
              }}>
                <LogOut size={13} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.83rem', lineHeight: 1.2 }}>
                  {getDayLabel(latest?.lastActive || latest?.updatedAt)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                  {fmtFull(latest?.lastActive || latest?.updatedAt)}
                </div>
              </div>
            </div>
          )}
        </td>

        {/* Duration */}
        <td style={{ ...T.td, width: COL_WIDTHS.duration }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 8,
            background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '0.82rem',
          }}>
            <Clock size={12} />
            {getDuration(latest)}
          </div>
        </td>

        {/* Status */}
        <td style={{ ...T.td, width: COL_WIDTHS.status }}>
          <StatusPill active={active} />
        </td>

        {/* Sessions */}
        <td style={{ ...T.td, width: COL_WIDTHS.sessions, textAlign: 'center' }}>
          {hasMore ? (
            <button onClick={() => setExpanded(v => !v)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 8,
              background: expanded ? '#eff6ff' : '#f8fafc',
              border: `1.5px solid ${expanded ? '#bfdbfe' : '#e2e8f0'}`,
              color: expanded ? '#2563eb' : '#475569',
              fontWeight: 600, fontSize: '0.76rem', cursor: 'pointer',
              transition: 'all .15s',
            }}>
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {expanded ? 'Hide' : `+${userSessions.length - 1} more`}
            </button>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600,
            }}>
              <Activity size={11} />1 session
            </span>
          )}
        </td>

        {/* Actions */}
        <td style={{ ...T.td, width: COL_WIDTHS.actions, textAlign: 'center' }}>
          {onDeleteClick && (
            <button
              onClick={() => onDeleteClick({ uid, username })}
              title={`Delete sessions for ${username}`}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 9,
                border: '1.5px solid #fecdd3', background: '#fff5f5', color: '#f43f5e',
                cursor: 'pointer', transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f43f5e'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#f43f5e'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.borderColor = '#fecdd3'; }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </td>
      </tr>

      {expanded && userSessions.slice(1).map(s => <SubRow key={s._id} s={s} />)}
    </>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, bg, border, icon }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 18px', borderRadius: 12,
    background: bg, border: `1.5px solid ${border}`,
    minWidth: 110,
  }}>
    <div style={{
      width: 34, height: 34, borderRadius: 9,
      background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', flexShrink: 0,
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: '1.3rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color, opacity: 0.7, fontWeight: 600, marginTop: 2, letterSpacing: '.2px' }}>
        {label}
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const SessionHistory = () => {
  const [sessions,     setSessions]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [spinning,     setSpinning]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const fetchSessions = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const endpoint = isAdmin ? `${API}/api/auth/sessions` : `${API}/api/auth/sessions/me`;
      const { data } = await axios.get(endpoint, getConfig(user.token));
      setSessions(data);
    } catch (err) {
      console.error('Unable to fetch sessions', err);
    } finally {
      setLoading(false);
    }
  }, [user?.token, isAdmin]);

  const handleRefresh = async () => {
    setSpinning(true);
    await fetchSessions();
    setTimeout(() => setSpinning(false), 600);
  };

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  usePolling(fetchSessions, 15_000, !!user?.token);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !user?.token) return;
    try {
      setDeleting(true);
      await axios.delete(`${API}/api/auth/sessions/user/${deleteTarget.uid}`, getConfig(user.token));
      setSessions(prev => prev.filter(s => (s.userId?._id || s.userId) !== deleteTarget.uid));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete sessions', err);
    } finally {
      setDeleting(false);
    }
  };

  const grouped       = groupByUser(sessions);
  const nonAdminAll   = sessions.filter(s => (s.userId?.role || 'user') !== 'admin');
  const todayAll      = nonAdminAll.filter(s => isToday(s.createdAt));
  const totalActive   = nonAdminAll.filter(s => s.status === 'Active').length;
  const todayCount    = todayAll.length;
  const uniqueUsers   = grouped.length;

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          username={deleteTarget.username}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .sh-wrap * { font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important; box-sizing: border-box; }
        @keyframes sh-spin  { to { transform: rotate(360deg); } }
        @keyframes sh-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes sh-pop   { 0%{transform:scale(.93);opacity:0} 100%{transform:none;opacity:1} }
        @keyframes sh-fade  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .sh-row-enter { animation: sh-fade .22s ease both; }
        .sh-table tbody tr:hover td { background: rgba(241,245,249,0.6) !important; }
      `}</style>

      <div className="sh-wrap" style={{
        marginTop: 24, borderRadius: 18,
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
        border: '1.5px solid #f1f5f9',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '22px 28px 20px',
          borderBottom: '1.5px solid #f1f5f9',
          background: 'linear-gradient(to bottom, #fafbff, white)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}>
          {/* Title area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid #c7d2fe',
            }}>
              <ShieldCheck size={20} color="#4f46e5" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Login History
              </h3>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '3px 0 0', fontWeight: 500 }}>
                All user sessions &amp; activity
              </p>
            </div>
          </div>

          {/* Stats + Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <StatCard
              label="Users"
              value={uniqueUsers}
              color="#4f46e5"
              bg="#eef2ff"
              border="#c7d2fe"
              icon={<User size={15} color="#4f46e5" />}
            />
            <StatCard
              label="Active"
              value={totalActive}
              color="#16a34a"
              bg="#f0fdf4"
              border="#bbf7d0"
              icon={<Activity size={15} color="#16a34a" />}
            />
            <StatCard
              label="Today"
              value={todayCount}
              color="#0369a1"
              bg="#eff6ff"
              border="#bae6fd"
              icon={<Clock size={15} color="#0369a1" />}
            />

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 10,
                border: '1.5px solid #e2e8f0', background: loading ? '#f8fafc' : 'white',
                color: '#475569', cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '0.82rem',
                transition: 'all .15s', height: 38,
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f8fafc'; }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = loading ? '#f8fafc' : 'white'; }}
            >
              <RefreshCw
                size={14}
                style={{
                  color: spinning ? '#4f46e5' : '#94a3b8',
                  animation: spinning ? 'sh-spin .6s linear infinite' : 'none',
                  transition: 'color .2s',
                }}
              />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{ overflowX: 'auto' }}>
          {loading && sessions.length === 0 ? (
            <div style={{ padding: '64px 28px', textAlign: 'center' }}>
              <RefreshCw size={22} color="#c7d2fe" style={{ animation: 'sh-spin 1s linear infinite', marginBottom: 12 }} />
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>Loading sessions…</p>
            </div>
          ) : grouped.length === 0 ? (
            <div style={{ padding: '64px 28px', textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, background: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                <ShieldCheck size={24} color="#cbd5e1" />
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>No sessions found.</p>
            </div>
          ) : (
            <table className="sh-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: COL_WIDTHS.user }} />
                <col style={{ width: COL_WIDTHS.device }} />
                <col style={{ width: COL_WIDTHS.login }} />
                <col style={{ width: COL_WIDTHS.logout }} />
                <col style={{ width: COL_WIDTHS.duration }} />
                <col style={{ width: COL_WIDTHS.status }} />
                <col style={{ width: COL_WIDTHS.sessions }} />
                <col style={{ width: COL_WIDTHS.actions }} />
              </colgroup>
              <thead>
                <tr>
                  {[
                    { label: 'User',       align: 'left'   },
                    { label: 'Device',     align: 'left'   },
                    { label: 'Last Login', align: 'left'   },
                    { label: 'Logged Out', align: 'left'   },
                    { label: 'Duration',   align: 'left'   },
                    { label: 'Status',     align: 'left'   },
                    { label: 'Sessions',   align: 'center' },
                    { label: 'Actions',    align: 'center' },
                  ].map(({ label, align }) => (
                    <th key={label} style={{ ...T.th, textAlign: align }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ uid, userSessions, latest }) => (
                  <UserRow
                    key={uid}
                    uid={uid}
                    userSessions={userSessions}
                    latest={latest}
                    currentUserId={user?._id}
                    onDeleteClick={isAdmin ? setDeleteTarget : undefined}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        {grouped.length > 0 && (
          <div style={{
            padding: '12px 28px', borderTop: '1.5px solid #f1f5f9',
            background: '#fafbfd', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
          }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 500 }}>
              {uniqueUsers} user{uniqueUsers !== 1 ? 's' : ''} · {nonAdminAll.length} total session{nonAdminAll.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 500 }}>
              Auto-refreshes every 15s
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default SessionHistory;