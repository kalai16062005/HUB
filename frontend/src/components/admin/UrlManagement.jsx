import React, { useCallback, useEffect, useState, useRef } from 'react';
import axios from 'axios';
import {
  Globe, Trash2, Edit2, RefreshCw, X, Check, Download, Upload,
  Wifi, WifiOff, HelpCircle, CheckCircle, XCircle, AlertTriangle,
  ChevronDown, Folder, FolderOpen, Plus
} from 'lucide-react';
import usePolling from '../../hooks/usePolling';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Toast ─────────────────────────────────────────────────────────────────────
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
      {type === 'error'   && <XCircle size={20} color="#dc2626" />}
      {type === 'warn'    && <AlertTriangle size={20} color="#d97706" />}
      <span style={{ fontSize: '0.88rem', fontWeight: '500', flex: 1,
        color: type === 'success' ? '#15803d' : type === 'error' ? '#dc2626' : '#92400e' }}>
        {message}
      </span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '1.1rem', color: type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#d97706' }}>×</button>
    </div>
  );
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────
const ConfirmDialog = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9998, backdropFilter: 'blur(2px)' }}>
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
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>Delete URL</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', opacity: 0.6, marginBottom: 24 }}>
          {message}<br />This action cannot be undone.
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

// ── Health badge ──────────────────────────────────────────────────────────────
const HealthBadge = ({ status }) => {
  const map = {
    online:  { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a', icon: <Wifi size={12}/>,      label: 'Online'  },
    offline: { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626', icon: <WifiOff size={12}/>,    label: 'Offline' },
    unknown: { bg: 'rgba(148,163,184,0.15)', color: '#64748b', icon: <HelpCircle size={12}/>, label: 'Unknown' },
  };
  const s = map[status] || map.unknown;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px',
      borderRadius:20, fontSize:'0.7rem', fontWeight:600,
      backgroundColor: s.bg, color: s.color }}>
      {s.icon} {s.label}
    </span>
  );
};

const Favicon = ({ src, name }) => {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width: 22, height: 22, borderRadius: 6,
      backgroundColor: 'rgba(37,99,235,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: '0.7rem', color: 'var(--primary)', flexShrink: 0 }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
  return <img src={src} alt={name} onError={() => setErr(true)}
    style={{ width:16, height:16, borderRadius:3, objectFit:'contain' }} />;
};

// ── Add URL in Folder Modal ───────────────────────────────────────────────────
const AddInFolderModal = ({ folderPath, onClose, onSuccess }) => {
  const [name, setName]     = useState('');
  const [url, setUrl]       = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) { setError('Name and URL are required.'); return; }
    let fixedUrl = url.trim();
    if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
      fixedUrl = 'https://' + fixedUrl;
    }
    setSaving(true); setError('');
    try {
      await axios.post(`${API}/api/urls`, { name: name.trim(), url: fixedUrl, folder: folderPath });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add URL. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)', borderRadius: 16, padding: 28,
        width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative' }}>

        {/* X close */}
        <button onClick={onClose} title="Close"
          style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30,
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
            color: 'var(--text-main)', cursor: 'pointer', opacity: 0.6 }}
          onMouseEnter={e => e.currentTarget.style.opacity='1'}
          onMouseLeave={e => e.currentTarget.style.opacity='0.6'}>
          <X size={14} />
        </button>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Add URL to Folder
          </h3>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
            padding: '4px 10px', borderRadius: 20, backgroundColor: 'rgba(245,158,11,0.12)',
            color: '#d97706', fontSize: '0.75rem', fontWeight: 600 }}>
            <Folder size={12} /> {folderPath}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)',
              opacity: 0.6, display: 'block', marginBottom: 5 }}>Site Name *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Google Drive"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)',
                color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)',
              opacity: 0.6, display: 'block', marginBottom: 5 }}>URL *</label>
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)',
                color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)',
              opacity: 0.6, display: 'block', marginBottom: 5 }}>Folder (auto-filled)</label>
            <input value={folderPath} readOnly
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                border: '1px solid rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.07)',
                color: '#d97706', fontSize: '0.88rem', fontWeight: 600, cursor: 'not-allowed' }} />
          </div>
          {error && <p style={{ fontSize: '0.78rem', color: '#ef4444', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: 8, cursor: 'pointer',
                backgroundColor: 'transparent', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500 }}>Cancel</button>
            <button type="submit" disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 20px', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
                backgroundColor: 'var(--primary)', border: 'none',
                color: 'white', fontSize: '0.85rem', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Adding...' : <><Check size={14} /> Add URL</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const UrlManagement = ({ onClose, users = [] }) => {
  const [urls, setUrls]               = useState([]);
  const [editingUrl, setEditingUrl]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [pingLoadingId, setPingLoadingId] = useState(null);
  const [toast, setToast]             = useState({ message: '', type: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, message: '' });
  const [addInFolderModal, setAddInFolderModal] = useState({ open: false, path: '' });
  const fileInputRef = useRef();

  // Dropdown state for edit form
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [editName, setEditName]           = useState('');
  const [editUrl, setEditUrl]             = useState('');
  const [editAssignedUsers, setEditAssignedUsers] = useState([]);
  const [editTags, setEditTags]           = useState('');
  const [editFolder, setEditFolder]       = useState('');
  const [editCategory, setEditCategory]   = useState('');

  // Collect unique folders from urls
  const allFolders = [...new Set(urls.map(u => u.folder).filter(Boolean))].sort();

  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), duration);
  };

  const fetchUrls = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await axios.get(`${API}/api/urls`);
      setUrls(data);
    } catch {
      if (!silent) showToast('Failed to fetch URLs', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUrls(); }, [fetchUrls]);
  usePolling(() => fetchUrls({ silent: true }), 30_000, true);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEditClick = (urlObj) => {
    setEditingUrl(urlObj);
    setEditName(urlObj.name);
    // Strip any accidental double prefix before showing in edit field
    let cleanUrl = urlObj.url || '';
    cleanUrl = cleanUrl.replace(/^(https?:\/\/)+/i, (match) => {
      return match.slice(0, match.toLowerCase().lastIndexOf('http'));
    });
    // Simpler: just keep last occurrence
    const httpsIdx = cleanUrl.lastIndexOf('https://');
    const httpIdx  = cleanUrl.lastIndexOf('http://');
    const lastIdx  = Math.max(httpsIdx, httpIdx);
    if (lastIdx > 0) cleanUrl = cleanUrl.slice(lastIdx);
    setEditUrl(cleanUrl);
    setEditAssignedUsers(urlObj.assignedTo?.map(u => typeof u === 'string' ? u : u._id) || []);
    setEditTags((urlObj.tags || []).join(', '));
    setEditFolder(urlObj.folder || '');
    setEditCategory(urlObj.category || '');
    setIsUserDropdownOpen(false);
  };

  const handleUpdateUrl = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Fix double-prefix (e.g. https://https:\\...)
      let fixedUrl = editUrl.trim();
      if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
        fixedUrl = 'https://' + fixedUrl;
      }
      const { data } = await axios.put(`${API}/api/urls/${editingUrl._id}`, {
        name: editName, url: fixedUrl, assignedTo: editAssignedUsers,
        folder: editFolder, category: editCategory,
        tags: editTags.split(',').map(tag => tag.trim()).filter(Boolean)
      });
      setUrls(list => list.map(u => u._id === data._id ? data : u));
      setEditingUrl(null);
      showToast('URL updated successfully', 'success');
    } catch {
      showToast('Failed to update URL', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUrl = (id, name) => {
    setConfirmDialog({ isOpen: true, id, message: `Are you sure you want to delete "${name}"?` });
  };

  const confirmDelete = async () => {
    const { id } = confirmDialog;
    setConfirmDialog({ isOpen: false, id: null, message: '' });
    const removed = urls.find(u => u._id === id);
    setUrls(list => list.filter(u => u._id !== id));
    try {
      await axios.delete(`${API}/api/urls/${id}`);
      showToast('URL deleted successfully', 'success');
    } catch {
      setUrls(list => removed ? [...list, removed] : list);
      showToast('Failed to delete URL', 'error');
    }
  };

  const toggleUserAssignment = (userId) => {
    setEditAssignedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handlePing = async (id) => {
    setPingLoadingId(id);
    try {
      const { data } = await axios.post(`${API}/api/health/ping/${id}`);
      setUrls(prev => prev.map(u => u._id === id
        ? { ...u, healthStatus: data.status, lastCheckedAt: data.lastCheckedAt } : u
      ));
      showToast(`Status: ${data.status}`, data.status === 'online' ? 'success' : 'warn');
    } catch {
      showToast('Ping failed', 'error');
    } finally {
      setPingLoadingId(null);
    }
  };

  const handleExportUrlsCsv = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/urls/export-csv`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = 'urls.csv'; a.click();
      URL.revokeObjectURL(blobUrl);
      showToast('Exported successfully', 'success');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const header = lines[0].toLowerCase();
      if (!header.includes('name') || !header.includes('url')) {
        showToast('CSV must have "name" and "url" columns', 'error'); return;
      }
      const cols = lines[0].split(',').map(c => c.trim().toLowerCase());
      const nameIdx = cols.indexOf('name');
      const urlIdx  = cols.indexOf('url');
      const assignedIdx = cols.indexOf('assignedto');
      const items = lines.slice(1).filter(r => r.trim()).map(row => {
        const cells = row.split(',');
        return {
          name: cells[nameIdx]?.trim(), url: cells[urlIdx]?.trim(),
          assignedTo: assignedIdx >= 0 ? (cells[assignedIdx]?.trim() || '').split(';').filter(Boolean) : []
        };
      }).filter(i => i.name && i.url);
      if (items.length === 0) { showToast('No valid rows found in CSV', 'error'); return; }
      await axios.post(`${API}/api/admin/urls/bulk`, { urls: items });
      showToast(`Imported ${items.length} URLs`, 'success');
      fetchUrls();
    } catch {
      showToast('Import failed', 'error');
    }
  };

  // Group urls by folder - show ALL folders including nested
  const rootUrls = urls.filter(u => !u.folder?.trim());
  const folderMap = urls.reduce((acc, u) => {
    const f = u.folder?.trim();
    if (f) { acc[f] = acc[f] || []; acc[f].push(u); }
    return acc;
  }, {});
  // allFolders already computed above from urls

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        .um-row:hover { background: rgba(37,99,235,0.03) !important; }
        .um-folder-row:hover { background: rgba(245,158,11,0.06) !important; }
        .um-close-btn:hover { opacity: 1 !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 10px; }
      `}</style>

      <Toast message={toast.message} type={toast.type}
        onClose={() => setToast({ message: '', type: '' })} />
      <ConfirmDialog isOpen={confirmDialog.isOpen} message={confirmDialog.message}
        onConfirm={confirmDelete} onCancel={() => setConfirmDialog({ isOpen: false, id: null, message: '' })} />

      {addInFolderModal.open && (
        <AddInFolderModal
          folderPath={addInFolderModal.path}
          onClose={() => setAddInFolderModal({ open: false, path: '' })}
          onSuccess={() => { fetchUrls(); showToast('URL added to folder', 'success'); }}
        />
      )}

      <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.7)',
        backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:110, padding:'20px' }}>
        <div className="glass custom-scrollbar" style={{ width:'100%', maxWidth:'960px', maxHeight:'92vh',
          padding:'30px', position:'relative', backgroundColor:'var(--sidebar-bg)',
          overflowY:'auto', borderRadius: 16 }}>

          {/* ✅ X close top-right */}
          <button className="um-close-btn" onClick={onClose} title="Close"
            style={{ position:'absolute', top:18, right:18, width:32, height:32, borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'var(--card-bg)', border:'1px solid var(--border-color)',
              color:'var(--text-main)', cursor:'pointer', opacity:0.65, transition:'opacity 0.15s', zIndex:1 }}>
            <X size={15}/>
          </button>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:20, flexWrap:'wrap', gap:10, paddingRight: 40 }}>
            <h2 style={{ fontSize:'1.4rem', display:'flex', alignItems:'center', gap:12,
              color:'var(--text-main)', margin:0 }}>
              <Globe size={24} color="var(--primary)"/> URL Management
            </h2>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => fileInputRef.current?.click()}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                  border:'1px solid var(--border-color)', borderRadius:7, color:'var(--text-main)',
                  backgroundColor:'var(--card-bg)', cursor:'pointer', fontSize:'0.82rem', fontWeight:600 }}>
                <Upload size={14}/> Import CSV
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCsv} style={{ display:'none' }} />
              <button onClick={handleExportUrlsCsv}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                  border:'1px solid var(--border-color)', borderRadius:7, color:'var(--text-main)',
                  backgroundColor:'var(--card-bg)', cursor:'pointer', fontSize:'0.82rem', fontWeight:600 }}>
                <Download size={14}/> Export CSV
              </button>
            </div>
          </div>

          {/* CSV hint */}
          <div style={{ padding:'10px 14px', backgroundColor:'var(--card-bg)',
            border:'1px solid var(--border-color)', borderRadius:8, marginBottom:16,
            fontSize:'0.78rem', color:'var(--text-main)', opacity:0.7 }}>
            Import CSV format: <code style={{ color:'var(--primary)' }}>name,url,assignedTo</code>
            &nbsp;— assignedTo optional, semicolons for multiple users:&nbsp;
            <code style={{ color:'var(--primary)' }}>john;jane</code>
          </div>

          {/* Edit form */}
          {editingUrl && (
            <div style={{ backgroundColor:'var(--card-bg)', padding:20, borderRadius:12,
              border:'1px solid var(--border-color)', marginBottom:20, position:'relative' }}>
              <button onClick={() => setEditingUrl(null)} title="Cancel edit"
                style={{ position:'absolute', top:14, right:14, width:28, height:28,
                  borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                  background:'var(--sidebar-bg)', border:'1px solid var(--border-color)',
                  color:'var(--text-main)', cursor:'pointer', opacity:0.6 }}
                onMouseEnter={e=>e.currentTarget.style.opacity='1'}
                onMouseLeave={e=>e.currentTarget.style.opacity='0.6'}>
                <X size={13}/>
              </button>
              <h3 style={{ fontSize:'1.05rem', marginBottom:15, color:'var(--text-main)', paddingRight:32 }}>
                Edit URL — <span style={{ color:'var(--primary)', fontWeight:700 }}>{editingUrl.name}</span>
              </h3>
              <form onSubmit={handleUpdateUrl} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', gap:10 }}>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    placeholder="Site Name" required className="glass"
                    style={{ flex:1, padding:'10px', backgroundColor:'var(--card-bg)',
                      color:'var(--text-main)', border:'1px solid var(--border-color)', borderRadius:6 }} />
                  <input type="text" value={editUrl} onChange={e => setEditUrl(e.target.value)}
                    placeholder="URL" required className="glass"
                    style={{ flex:2, padding:'10px', backgroundColor:'var(--card-bg)',
                      color:'var(--text-main)', border:'1px solid var(--border-color)', borderRadius:6 }} />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:'0.75rem', color:'var(--text-main)', opacity:0.5 }}>Tags</label>
                    <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)}
                      placeholder="crm, internal"
                      style={{ width:'100%', padding:'8px 10px', marginTop:3, backgroundColor:'var(--card-bg)',
                        color:'var(--text-main)', border:'1px solid var(--border-color)', borderRadius:6, fontSize:'0.82rem' }}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:'0.75rem', color:'var(--text-main)', opacity:0.5 }}>Folder</label>
                    <input type="text" value={editFolder} onChange={e => setEditFolder(e.target.value)}
                      placeholder="Team A" list="folder-suggestions"
                      style={{ width:'100%', padding:'8px 10px', marginTop:3, backgroundColor:'var(--card-bg)',
                        color:'var(--text-main)', border:'1px solid var(--border-color)', borderRadius:6, fontSize:'0.82rem' }}/>
                    <datalist id="folder-suggestions">
                      {allFolders.map(f => <option key={f} value={f} />)}
                    </datalist>
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:'0.75rem', color:'var(--text-main)', opacity:0.5 }}>Category</label>
                    <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)}
                      placeholder="Operations"
                      style={{ width:'100%', padding:'8px 10px', marginTop:3, backgroundColor:'var(--card-bg)',
                        color:'var(--text-main)', border:'1px solid var(--border-color)', borderRadius:6, fontSize:'0.82rem' }}/>
                  </div>
                </div>

                {/* Visible to users dropdown */}
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                    Visible to users:
                  </label>
                  <div onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ opacity: editAssignedUsers.length ? 1 : 0.5 }}>
                      {editAssignedUsers.length > 0 ? `${editAssignedUsers.length} Users selected` : 'Select Users'}
                    </span>
                    <ChevronDown size={16} style={{ transform: isUserDropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                  </div>
                  {isUserDropdownOpen && (
                    <div className="custom-scrollbar" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      marginTop: 6, backgroundColor: 'var(--sidebar-bg)', borderRadius: 12,
                      border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                      maxHeight: 200, overflowY: 'auto', padding: 8 }}>
                      {users.filter(u => u.role !== 'admin').map(u => (
                        <div key={u._id} onClick={() => toggleUserAssignment(u._id)}
                          style={{ padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 10,
                            backgroundColor: editAssignedUsers.includes(u._id) ? 'rgba(37,99,235,0.08)' : 'transparent',
                            transition: '0.15s' }}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: editAssignedUsers.includes(u._id) ? 'var(--primary)' : 'transparent' }}>
                            {editAssignedUsers.includes(u._id) && <Check size={12} color="white" />}
                          </div>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{u.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop: 4 }}>
                  <button type="button" onClick={() => setEditingUrl(null)}
                    style={{ padding:'8px 16px', borderRadius:6, border:'1px solid var(--border-color)',
                      background:'transparent', color:'var(--text-main)', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:6 }}>
                    <X size={14}/> Cancel
                  </button>
                  <button type="submit" disabled={loading}
                    style={{ padding:'8px 16px', backgroundColor:'var(--primary)',
                      color:'white', borderRadius:6, fontWeight:600, border:'none', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:6 }}>
                    <Check size={14}/> {loading ? 'Saving...' : 'Update URL'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Folder sections ── */}
          {allFolders.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-main)', opacity:0.45,
                textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
                Folders ({allFolders.length})
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {allFolders.map(folder => {
                  const folderUrls = folderMap[folder] || [];
                  return (
                    <div key={folder} style={{ borderRadius:8, border:'1px solid var(--border-color)',
                      backgroundColor:'var(--card-bg)', overflow:'hidden' }}>
                      {/* Folder header row */}
                      <div className="um-folder-row" style={{ display:'flex', alignItems:'center',
                        justifyContent:'space-between', padding:'10px 14px',
                        borderBottom: '1px solid var(--border-color)', transition:'background 0.15s' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <FolderOpen size={16} color="#f59e0b" />
                          <span style={{ fontSize:'0.88rem', fontWeight:700, color:'var(--text-main)' }}>
                            {folder}
                          </span>
                          <span style={{ fontSize:'0.7rem', fontWeight:600, padding:'2px 7px',
                            borderRadius:20, backgroundColor:'rgba(245,158,11,0.12)', color:'#d97706' }}>
                            {folderUrls.length} URL{folderUrls.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {/* ✅ "+ Add URL" button inside folder */}
                        <button
                          onClick={() => setAddInFolderModal({ open: true, path: folder })}
                          title={`Add URL to "${folder}"`}
                          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
                            borderRadius:6, border:'1px dashed rgba(245,158,11,0.5)',
                            backgroundColor:'rgba(245,158,11,0.06)', color:'#d97706',
                            cursor:'pointer', fontSize:'0.75rem', fontWeight:600, transition:'all 0.15s' }}
                          onMouseEnter={e=>{ e.currentTarget.style.borderColor='#f59e0b'; e.currentTarget.style.backgroundColor='rgba(245,158,11,0.12)'; }}
                          onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(245,158,11,0.5)'; e.currentTarget.style.backgroundColor='rgba(245,158,11,0.06)'; }}>
                          <Plus size={13}/> Add URL
                        </button>
                      </div>
                      {/* URLs inside folder */}
                      <table style={{ width:'100%', textAlign:'left', borderCollapse:'collapse' }}>
                        <tbody>
                          {folderUrls.map(url => (
                            <tr key={url._id} className="um-row" style={{ color:'var(--text-main)', fontSize:'0.86rem', transition:'background 0.1s' }}>
                              <td style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)', paddingLeft:38 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  <Favicon src={url.favicon} name={url.name}/>
                                  <span style={{ fontWeight:600 }}>{url.name}</span>
                                </div>
                              </td>
                              <td style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)',
                                fontSize:'0.72rem', opacity:0.55, maxWidth:200, overflow:'hidden',
                                textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url.url}</td>
                              <td style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)' }}>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                                  {url.assignedTo?.length > 0 ? url.assignedTo.map((u, i) => (
                                    <span key={i} style={{ padding:'2px 7px', backgroundColor:'rgba(37,99,235,0.1)',
                                      color:'var(--primary)', borderRadius:4, fontSize:'0.7rem' }}>
                                      {typeof u === 'string' ? 'User' : u.username}
                                    </span>
                                  )) : <span style={{ fontSize:'0.7rem', opacity:0.4 }}>All</span>}
                                </div>
                              </td>
                              <td style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)' }}>
                                <HealthBadge status={url.healthStatus || 'unknown'}/>
                              </td>
                              <td style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)', textAlign:'right' }}>
                                <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                                  <button onClick={() => handlePing(url._id)} disabled={pingLoadingId === url._id}
                                    style={{ padding:5, background:'transparent', border:'none', color:'#0369a1', cursor:'pointer' }}>
                                    <RefreshCw size={14} style={{ animation: pingLoadingId === url._id ? 'spin 1s linear infinite' : 'none' }}/>
                                  </button>
                                  <button onClick={() => handleEditClick(url)}
                                    style={{ padding:5, background:'transparent', border:'none', color:'var(--primary)', cursor:'pointer' }}>
                                    <Edit2 size={14}/>
                                  </button>
                                  <button onClick={() => handleDeleteUrl(url._id, url.name)}
                                    style={{ padding:5, background:'transparent', border:'none', color:'#ef4444', cursor:'pointer' }}>
                                    <Trash2 size={14}/>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Root URLs (no folder) ── */}
          <div>
            <p style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-main)', opacity:0.45,
              textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
              {allFolders.length > 0 ? `No Folder (${rootUrls.length})` : `All URLs (${urls.length})`}
            </p>
            <div style={{ overflowX:'auto', borderRadius:8, border:'1px solid var(--border-color)' }}>
              <table style={{ width:'100%', textAlign:'left', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ color:'var(--text-main)', opacity:0.5, fontSize:'0.78rem', textTransform:'uppercase' }}>
                    <th style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)', backgroundColor:'var(--card-bg)' }}>Site</th>
                    <th style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)', backgroundColor:'var(--card-bg)' }}>URL</th>
                    <th style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)', backgroundColor:'var(--card-bg)' }}>Visible for</th>
                    <th style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)', backgroundColor:'var(--card-bg)' }}>Status</th>
                    <th style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)', backgroundColor:'var(--card-bg)', textAlign:'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(allFolders.length > 0 ? rootUrls : urls).map(url => (
                    <tr key={url._id} className="um-row" style={{ color:'var(--text-main)', fontSize:'0.88rem', transition:'background 0.1s' }}>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border-color)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Favicon src={url.favicon} name={url.name}/>
                          <span style={{ fontWeight:600 }}>{url.name}</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border-color)',
                        fontSize:'0.73rem', opacity:0.65, maxWidth:220, overflow:'hidden',
                        textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url.url}</td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border-color)' }}>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                          {url.assignedTo?.length > 0 ? url.assignedTo.map((u, i) => (
                            <span key={i} style={{ padding:'2px 7px', backgroundColor:'rgba(37,99,235,0.1)',
                              color:'var(--primary)', borderRadius:4, fontSize:'0.7rem' }}>
                              {typeof u === 'string' ? 'User' : u.username}
                            </span>
                          )) : <span style={{ fontSize:'0.7rem', opacity:0.4 }}>All</span>}
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border-color)' }}>
                        <HealthBadge status={url.healthStatus || 'unknown'}/>
                      </td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border-color)', textAlign:'right' }}>
                        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          <button onClick={() => handlePing(url._id)} disabled={pingLoadingId === url._id}
                            style={{ padding:6, background:'transparent', border:'none', color:'#0369a1', cursor:'pointer' }}>
                            <RefreshCw size={15} style={{ animation: pingLoadingId === url._id ? 'spin 1s linear infinite' : 'none' }}/>
                          </button>
                          <button onClick={() => handleEditClick(url)}
                            style={{ padding:6, background:'transparent', border:'none', color:'var(--primary)', cursor:'pointer' }}>
                            <Edit2 size={15}/>
                          </button>
                          <button onClick={() => handleDeleteUrl(url._id, url.name)}
                            style={{ padding:6, background:'transparent', border:'none', color:'#ef4444', cursor:'pointer' }}>
                            <Trash2 size={15}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(allFolders.length > 0 ? rootUrls : urls).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign:'center', padding:'32px',
                        color:'var(--text-main)', opacity:0.4, fontSize:'0.85rem' }}>
                        No URLs yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom close button */}
          <button className="um-close-btn" onClick={onClose}
            style={{ marginTop: 24, padding:'11px', width:'100%',
              backgroundColor:'transparent', border:'1px solid var(--border-color)',
              borderRadius:8, color:'var(--text-main)', cursor:'pointer',
              fontSize:'0.9rem', opacity:0.65, display:'flex', alignItems:'center',
              justifyContent:'center', gap:8, transition:'opacity 0.15s' }}>
            <X size={15}/> Close
          </button>
        </div>
      </div>
    </>
  );
};

export default UrlManagement;