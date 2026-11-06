import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, User, Search, Clock, RefreshCw, ChevronDown } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

const formatDuration = (seconds) => {
  if (!seconds || seconds < 1) return '< 1s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit'
  });
};

const ActivityViewer = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterUser, setFilterUser] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchLogs = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const res = await axios.get(`${API}/api/admin/activity`);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchLogs();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

 
  const uniqueUsersOnly = [...new Set(logs.map(l => l.user?.username).filter(u => u && u !== 'admin'))];
  
  const filteredLogs = filterUser === 'ALL'
    ? logs
    : logs.filter(l => l.user?.username === filterUser);

  // Dynamic Stats
  const totalTime = filteredLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
  const urlCounts = filteredLogs.reduce((acc, l) => {
    const name = l.url?.urlName || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const mostVisited = Object.entries(urlCounts).sort((a, b) => b[1] - a[1])[0];

  const filteredSearchUsers = uniqueUsersOnly.filter(u => 
    u.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
      <div className="glass" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '30px', position: 'relative', backgroundColor: 'var(--sidebar-bg)', borderRadius: '15px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-main)' }}>
            <Activity size={24} color="var(--primary)" /> Activity Tracking
          </h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => fetchLogs(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.82rem' }}>
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
            <button onClick={onClose} title="Close"
              style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', cursor: 'pointer', opacity: 0.65, transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.65'}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, padding: '14px', borderRadius: '10px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-main)', opacity: 0.5 }}>VIEWS</p>
            <p style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary)' }}>{filteredLogs.length}</p>
          </div>
          <div style={{ flex: 1, padding: '14px', borderRadius: '10px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-main)', opacity: 0.5 }}>TIME SPENT</p>
            <p style={{ fontSize: '1.4rem', fontWeight: '700', color: '#22c55e' }}>{formatDuration(totalTime)}</p>
          </div>
          <div style={{ flex: 1, padding: '14px', borderRadius: '10px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-main)', opacity: 0.5 }}>MOST VISITED</p>
            <p style={{ fontSize: '1rem', fontWeight: '700', color: '#a855f7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {mostVisited ? `${mostVisited[0]} (${mostVisited[1]}x)` : '—'}
            </p>
          </div>
        </div>

        {/* Filter Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => { setFilterUser('ALL'); setIsDropdownOpen(false); }} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: filterUser === 'ALL' ? 'var(--primary)' : 'var(--card-bg)', color: filterUser === 'ALL' ? 'white' : 'var(--text-main)' }}>All Users</button>
          <button onClick={() => { setFilterUser('admin'); setIsDropdownOpen(false); }} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: filterUser === 'admin' ? 'var(--primary)' : 'var(--card-bg)', color: filterUser === 'admin' ? 'white' : 'var(--text-main)' }}>Admin</button>

          {/* User Only Search Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={14} opacity={0.5} />
                <span>{filterUser !== 'ALL' && filterUser !== 'admin' ? filterUser : 'Search User...'}</span>
              </div>
              <ChevronDown size={14} opacity={0.5} />
            </div>
            {isDropdownOpen && (
              <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                <input type="text" placeholder="Type username..." autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', border: 'none', borderBottom: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', outline: 'none' }} />
                {filteredSearchUsers.map(u => (
                  <div key={u} onClick={() => { setFilterUser(u); setIsDropdownOpen(false); setSearchQuery(''); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-main)', backgroundColor: filterUser === u ? 'var(--primary)' : 'transparent' }}>{u}</div>
                ))}
                {filteredSearchUsers.length === 0 && <div style={{ padding: '10px', fontSize: '0.75rem', opacity: 0.5 }}>No users found</div>}
              </div>
            )}
          </div>
        </div>

        {/* Activity List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? <p style={{ textAlign: 'center', opacity: 0.4, marginTop: '40px' }}>Loading...</p> : 
            filteredLogs.map((log, i) => (
              <div key={log._id || i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--primary)' }}>{log.url?.urlName?.charAt(0)?.toUpperCase() || '?'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>{log.url?.urlName || 'Unknown'}</p>
                    <span style={{ fontSize: '0.72rem', color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: '20px' }}>{formatDuration(log.duration)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '3px', opacity: 0.5, fontSize: '0.72rem' }}>
                    <span><User size={10} inline /> {log.user?.username}</span>
                    <span><Clock size={10} inline /> {formatTime(log.openedAt)}</span>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
        <button onClick={onClose}
          style={{ marginTop: '20px', padding: '11px', width: '100%', borderRadius: '8px',
            border: '1px solid var(--border-color)', cursor: 'pointer',
            backgroundColor: 'transparent', color: 'var(--text-main)',
            fontSize: '0.9rem', opacity: 0.65, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.65'}>
          <X size={15} /> Close
        </button>
      </div>
    </div>
  );
};

export default ActivityViewer;