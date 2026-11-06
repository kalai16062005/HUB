import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Globe, Settings, ChevronRight, LogOut, Shield,
  ChevronsLeft, ChevronsRight, FlaskConical,
  History as HistoryIcon, Activity,
  Search, Star, Pin, Tag, Folder, FolderOpen, X, GripVertical,
  ChevronDown, ChevronRight as ChevronRightIcon, Check,
  Pencil, Trash2,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/useAuth';
import logo from '../assets/hub-hub.png';

const API         = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const FOLDERS_KEY = '__hub_folders__';

// ─── Favicon ──────────────────────────────────────────────────────────────────
const Favicon = ({ src, name }) => {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>
      {name?.charAt(0)?.toUpperCase()}
    </span>
  );
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width: 18, height: 18, objectFit: 'contain' }} />
  );
};

// ─── HealthDot ────────────────────────────────────────────────────────────────
const HealthDot = ({ status }) => (
  <span style={{
    position: 'absolute', bottom: 0, right: 0,
    width: 9, height: 9, borderRadius: '50%',
    border: '1.5px solid var(--sidebar-bg)',
    backgroundColor:
      status === 'online'  ? '#22c55e' :
      status === 'offline' ? '#ef4444' : '#94a3b8',
  }} />
);

// ─── CreateFolderModal ────────────────────────────────────────────────────────
const CreateFolderModal = ({ parentPath, onClose, onCreate }) => {
  const [name, setName]   = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a folder name.'); return; }
    const fullPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
    onCreate(fullPath);
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-main)', opacity: 0.4,
        }}>
          <X size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10,
            backgroundColor: 'rgba(245,158,11,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Folder size={20} color="#f59e0b" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              {parentPath ? 'New Subfolder' : 'New Folder'}
            </h3>
            {parentPath && (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-main)', opacity: 0.45, margin: '2px 0 0' }}>
                Inside: {parentPath}
              </p>
            )}
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)',
              opacity: 0.6, display: 'block', marginBottom: 6 }}>
              Folder name
              {!parentPath && (
                <span style={{ opacity: 0.5, fontWeight: 400 }}>
                  {' '}(use "/" for nesting, e.g. Work/Frontend)
                </span>
              )}
            </label>
            <input ref={inputRef} value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder={parentPath ? 'Subfolder name' : 'e.g. Work or Work/Frontend'}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                border: `1px solid ${error ? '#ef4444' : 'var(--border-color)'}`,
                backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '0.88rem' }} />
            {error && <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '4px 0 0' }}>{error}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: 8, cursor: 'pointer',
                backgroundColor: 'transparent', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500 }}>
              Cancel
            </button>
            <button type="submit"
              style={{ display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 20px', borderRadius: 8, cursor: 'pointer',
                backgroundColor: '#f59e0b', border: 'none',
                color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>
              <Folder size={14} /> Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── FolderAddUrlModal ────────────────────────────────────────────────────────
const FolderAddUrlModal = ({ folderPath, onClose, onSuccess, userToken }) => {
  const [name, setName]     = useState('');
  const [url, setUrl]       = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) { setError('Name and URL are required.'); return; }
    setSaving(true); setError('');
    try {
      await axios.post(
        `${API}/api/urls`,
        { name: name.trim(), url: url.trim(), folder: folderPath },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      onSuccess(); onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add URL. Try again.');
    } finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-main)', opacity: 0.45,
        }}><X size={18} /></button>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Add URL to folder
          </h3>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
            marginTop: 6, padding: '3px 10px', borderRadius: 20,
            backgroundColor: 'rgba(245,158,11,0.12)', color: '#d97706', fontSize: '0.75rem', fontWeight: 600 }}>
            <Folder size={12} /> {folderPath}
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Site Name *', val: name, set: setName, ph: 'e.g. Google Drive', type: 'text', af: true },
            { label: 'URL *',       val: url,  set: setUrl,  ph: 'https://example.com', type: 'url', af: false },
          ].map(({ label, val, set, ph, type, af }) => (
            <div key={label}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)',
                opacity: 0.6, display: 'block', marginBottom: 5 }}>{label}</label>
              <input autoFocus={af} value={val} onChange={e => set(e.target.value)}
                placeholder={ph} type={type}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                  border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-main)', fontSize: '0.88rem' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)',
              opacity: 0.6, display: 'block', marginBottom: 5 }}>Folder (auto-filled)</label>
            <input value={folderPath} readOnly
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                border: '1px solid var(--border-color)', backgroundColor: 'rgba(245,158,11,0.07)',
                color: '#d97706', fontSize: '0.88rem', fontWeight: 600, cursor: 'not-allowed' }} />
          </div>
          {error && <p style={{ fontSize: '0.78rem', color: '#ef4444', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: 8, cursor: 'pointer',
                backgroundColor: 'transparent', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500 }}>Cancel</button>
            <button type="submit" disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8,
                cursor: saving ? 'not-allowed' : 'pointer', backgroundColor: 'var(--primary)', border: 'none',
                color: 'white', fontSize: '0.85rem', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Adding...' : <><Check size={14} /> Add URL</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── RenameFolderModal ────────────────────────────────────────────────────────
const RenameFolderModal = ({ currentName, onClose, onRename }) => {
  const [name, setName]   = useState(currentName);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 50);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Folder name is required.'); return; }
    if (trimmed === currentName) { onClose(); return; }
    onRename(trimmed);
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'var(--sidebar-bg)', border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 400,
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)', position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14, width: 30, height: 30,
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          color: 'var(--text-main)', cursor: 'pointer', opacity: 0.6,
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
          <X size={14} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12,
            backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={20} color="#f59e0b" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Rename Folder
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', opacity: 0.5, margin: '3px 0 0' }}>
              Current: <strong>{currentName}</strong>
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)',
              opacity: 0.6, display: 'block', marginBottom: 6 }}>New Name</label>
            <input ref={inputRef} value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Work, Projects…"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                border: `1.5px solid ${error ? '#ef4444' : 'var(--border-color)'}`,
                backgroundColor: 'var(--card-bg)', color: 'var(--text-main)',
                fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit' }} />
            {error && <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '5px 0 0' }}>{error}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: 8, cursor: 'pointer',
                backgroundColor: 'transparent', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500 }}>Cancel</button>
            <button type="submit"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px',
                borderRadius: 8, cursor: 'pointer', backgroundColor: '#f59e0b', border: 'none',
                color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>
              <Check size={14} /> Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── DeleteFolderModal ────────────────────────────────────────────────────────
const DeleteFolderModal = ({ folderName, urlCount, onClose, onDelete }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: 20,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      backgroundColor: 'var(--sidebar-bg)', border: '1px solid var(--border-color)',
      borderRadius: 16, padding: 28, width: '100%', maxWidth: 400,
      boxShadow: '0 24px 60px rgba(0,0,0,0.3)', position: 'relative',
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 14, right: 14, width: 30, height: 30,
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
        color: 'var(--text-main)', cursor: 'pointer', opacity: 0.6,
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
        <X size={14} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12,
          backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={20} color="#ef4444" />
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Delete Folder
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', opacity: 0.5, margin: '3px 0 0' }}>
            This action cannot be undone
          </p>
        </div>
      </div>
      <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 20,
        backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', margin: 0 }}>
          Delete <strong style={{ color: '#ef4444' }}>"{folderName}"</strong>?
          {urlCount > 0
            ? <> The <strong>{urlCount}</strong> URL{urlCount !== 1 ? 's' : ''} inside will be <strong>unfoldered</strong> (not deleted).</>
            : <> The empty folder will be removed.</>
          }
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose}
          style={{ padding: '9px 18px', borderRadius: 8, cursor: 'pointer',
            backgroundColor: 'transparent', border: '1px solid var(--border-color)',
            color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500 }}>Cancel</button>
        <button onClick={onDelete}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px',
            borderRadius: 8, cursor: 'pointer', backgroundColor: '#ef4444', border: 'none',
            color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  </div>
);

// ─── Folder helpers ───────────────────────────────────────────────────────────
const loadSavedFolders = () => {
  try { return JSON.parse(localStorage.getItem(FOLDERS_KEY) || '[]'); }
  catch { return []; }
};
const saveFolders = (list) => localStorage.setItem(FOLDERS_KEY, JSON.stringify(list));

const buildTree = (urlList, extraPaths) => {
  const tree = {};
  const ensurePath = (pathStr) => {
    const segs = pathStr.split('/').map(s => s.trim()).filter(Boolean);
    if (!segs.length) return;
    let cur = tree;
    segs.forEach(seg => {
      if (!cur[seg]) cur[seg] = { __urls: [], __sub: {} };
      cur = cur[seg].__sub;
    });
  };
  extraPaths.forEach(p => ensurePath(p));
  urlList.forEach(url => {
    if (!url.folder?.trim()) return;
    const segs = url.folder.split('/').map(s => s.trim()).filter(Boolean);
    let cur = tree;
    segs.forEach((seg, i) => {
      if (!cur[seg]) cur[seg] = { __urls: [], __sub: {} };
      if (i === segs.length - 1) cur[seg].__urls.push(url);
      cur = cur[seg].__sub;
    });
  });
  return tree;
};

// ─── UrlCard ──────────────────────────────────────────────────────────────────
const UrlCard = ({
  item, isCollapsed, activeUrl, onUrlSelect,
  prefs, toggleFav, togglePin,
  dragId, dragOverId, handleDragStart, handleDragOver, handleDrop, handleDragEnd,
  indent = 0,
}) => {
  const isFav        = prefs.favorites.includes(item._id);
  const isPinned     = prefs.pinned.includes(item._id);
  const isActive     = activeUrl?._id === item._id;
  const isDragging   = dragId === item._id;
  const isDragTarget = dragOverId === item._id;

  return (
    <div
      draggable={!isCollapsed}
      onDragStart={e => handleDragStart(e, item._id)}
      onDragOver={e  => handleDragOver(e, item._id)}
      onDrop={e      => handleDrop(e, item._id)}
      onDragEnd={handleDragEnd}
      onClick={() => onUrlSelect(item)}
      style={{
        padding: isCollapsed ? '8px 0' : '8px 10px',
        marginLeft: isCollapsed ? 0 : indent,
        borderRadius: 7, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        backgroundColor: isActive ? 'var(--card-bg)' : 'transparent',
        border: isDragTarget ? '1px dashed var(--primary)'
          : isActive ? '1px solid var(--border-color)' : '1px solid transparent',
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.15s, border 0.1s, background 0.1s',
        position: 'relative',
      }}
      title={isCollapsed ? item.name : ''}
    >
      {!isCollapsed && (
        <div style={{ color: 'var(--text-main)', opacity: 0.2, flexShrink: 0, cursor: 'grab' }}>
          <GripVertical size={12} />
        </div>
      )}
      <div style={{ position: 'relative', minWidth: 28, height: 28, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'var(--card-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Favicon src={item.favicon} name={item.name} />
        </div>
        <HealthDot status={item.healthStatus} />
      </div>
      {!isCollapsed && (
        <>
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
            {isPinned && (
              <span style={{ fontSize: '0.58rem', backgroundColor: 'rgba(37,99,235,0.12)',
                color: 'var(--primary)', padding: '1px 4px', borderRadius: 8,
                marginBottom: 1, display: 'inline-block', fontWeight: 600 }}>📌 pinned</span>
            )}
            <p style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-main)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
              {item.name}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button onClick={e => toggleFav(e, item._id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3,
                color: isFav ? '#f59e0b' : 'var(--text-main)', opacity: isFav ? 1 : 0.25 }}
              title={isFav ? 'Unfavorite' : 'Favorite'}>
              <Star size={12} fill={isFav ? '#f59e0b' : 'none'} />
            </button>
            <button onClick={e => togglePin(e, item._id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3,
                color: isPinned ? 'var(--primary)' : 'var(--text-main)', opacity: isPinned ? 1 : 0.25 }}
              title={isPinned ? 'Unpin' : 'Pin to top'}>
              <Pin size={12} />
            </button>
          </div>
          {isActive && <ChevronRight size={14} color="var(--primary)" style={{ flexShrink: 0 }} />}
        </>
      )}
    </div>
  );
};

// ─── FolderNode ───────────────────────────────────────────────────────────────
const FolderNode = ({
  folderName, data, level, isCollapsed,
  activeUrl, onUrlSelect, prefs, toggleFav, togglePin,
  dragId, dragOverId, handleDragStart, handleDragOver, handleDrop, handleDragEnd,
  isAdmin, folderPath, onFolderOpen,
  // NEW: for rename/delete
  allUrls, savedFolders, setSavedFolders, onUrlAdded, userToken,
}) => {
  const [open, setOpen]               = useState(true);
  const [hovered, setHovered]         = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const hasChildren = Object.keys(data.__sub || {}).length > 0;
  const hasUrls     = (data.__urls || []).length > 0;

  const totalUrlCount = (allUrls || []).filter(u =>
    u.folder === folderPath || u.folder?.startsWith(folderPath + '/')
  ).length;

  const handleFolderClick = () => {
    if (isCollapsed) {
      setOpen(o => !o);
    } else {
      if (typeof onFolderOpen === 'function') onFolderOpen(folderPath);
    }
  };

  // ── Rename handler ──────────────────────────────────────────────────────────
  const handleRename = async (newName) => {
    const segs      = folderPath.split('/');
    const parentPth = segs.slice(0, -1).join('/');
    const newPath   = parentPth ? `${parentPth}/${newName}` : newName;

    const urlsToUpdate = (allUrls || []).filter(u =>
      u.folder === folderPath || u.folder?.startsWith(folderPath + '/')
    );
    try {
      await Promise.all(urlsToUpdate.map(u =>
        axios.put(`${API}/api/urls/${u._id}`, {
          ...u,
          assignedTo: u.assignedTo?.map(x => typeof x === 'string' ? x : x._id) || [],
          folder: u.folder === folderPath
            ? newPath
            : newPath + u.folder.slice(folderPath.length),
        })
      ));
      const updatedFolders = (savedFolders || []).map(f =>
        f === folderPath          ? newPath :
        f.startsWith(folderPath + '/') ? newPath + f.slice(folderPath.length) : f
      );
      setSavedFolders(updatedFolders);
      saveFolders(updatedFolders);
      if (typeof onUrlAdded === 'function') onUrlAdded();
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  // ── Delete handler ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const urlsToUnfolder = (allUrls || []).filter(u =>
      u.folder === folderPath || u.folder?.startsWith(folderPath + '/')
    );
    try {
      await Promise.all(urlsToUnfolder.map(u =>
        axios.put(`${API}/api/urls/${u._id}`, {
          ...u,
          assignedTo: u.assignedTo?.map(x => typeof x === 'string' ? x : x._id) || [],
          folder: '',
        })
      ));
      const updatedFolders = (savedFolders || []).filter(f =>
        f !== folderPath && !f.startsWith(folderPath + '/')
      );
      setSavedFolders(updatedFolders);
      saveFolders(updatedFolders);
      if (typeof onUrlAdded === 'function') onUrlAdded();
    } catch (err) {
      console.error('Delete folder failed:', err);
    }
    setDeleteModal(false);
  };

  return (
    <>
      {/* Modals are portaled here — they render outside the folder row */}
      {renameModal && (
        <RenameFolderModal
          currentName={folderName}
          onClose={() => setRenameModal(false)}
          onRename={handleRename}
        />
      )}
      {deleteModal && (
        <DeleteFolderModal
          folderName={folderName}
          urlCount={totalUrlCount}
          onClose={() => setDeleteModal(false)}
          onDelete={handleDelete}
        />
      )}

      <div style={{ marginLeft: isCollapsed ? 0 : level * 10 }}>
        {/* ── Folder row ── */}
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: isCollapsed ? '8px 0' : '6px 8px',
            borderRadius: 6,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            backgroundColor: hovered ? 'var(--card-bg)' : 'transparent',
            transition: 'background 0.1s', userSelect: 'none',
          }}
          title={isCollapsed ? folderName : ''}
        >
          {/* Chevron */}
          {!isCollapsed && (
            <span
              onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
              style={{ color: 'var(--text-main)', opacity: 0.3, flexShrink: 0, cursor: 'pointer' }}
            >
              {open ? <ChevronDown size={11} /> : <ChevronRightIcon size={11} />}
            </span>
          )}

          {/* Folder icon */}
          <span onClick={handleFolderClick} style={{ color: '#f59e0b', flexShrink: 0, display: 'flex', cursor: 'pointer' }}>
            {open
              ? <FolderOpen size={isCollapsed ? 20 : 15} />
              : <Folder    size={isCollapsed ? 20 : 15} />}
          </span>

          {/* Folder name */}
          {!isCollapsed && (
            <span
              onClick={handleFolderClick}
              style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)',
                flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                cursor: 'pointer' }}>
              {folderName}
            </span>
          )}

          {/* ✏️ Rename + 🗑️ Delete — admin only, expanded only, hover only */}
          {!isCollapsed && isAdmin && hovered && (
            <div
              onClick={e => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}
            >
              <button
                onClick={e => { e.stopPropagation(); setRenameModal(true); }}
                title="Rename folder"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '3px 5px', borderRadius: 5, display: 'flex', alignItems: 'center',
                  color: 'var(--text-main)', opacity: 0.4, transition: 'all 0.12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.background = 'rgba(245,158,11,0.12)';
                  e.currentTarget.style.color = '#f59e0b';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.4';
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = 'var(--text-main)';
                }}
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setDeleteModal(true); }}
                title="Delete folder"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '3px 5px', borderRadius: 5, display: 'flex', alignItems: 'center',
                  color: 'var(--text-main)', opacity: 0.4, transition: 'all 0.12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '0.4';
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = 'var(--text-main)';
                }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* ── Children ── */}
        {open && (
          <div>
            {hasUrls && data.__urls.map(item => (
              <UrlCard key={item._id} item={item} isCollapsed={isCollapsed}
                activeUrl={activeUrl} onUrlSelect={onUrlSelect}
                prefs={prefs} toggleFav={toggleFav} togglePin={togglePin}
                dragId={dragId} dragOverId={dragOverId}
                handleDragStart={handleDragStart} handleDragOver={handleDragOver}
                handleDrop={handleDrop} handleDragEnd={handleDragEnd}
                indent={(level + 1) * 10} />
            ))}
            {hasChildren && Object.entries(data.__sub).map(([subName, subData]) => (
              <FolderNode key={subName} folderName={subName} data={subData}
                level={level + 1} isCollapsed={isCollapsed}
                activeUrl={activeUrl} onUrlSelect={onUrlSelect}
                prefs={prefs} toggleFav={toggleFav} togglePin={togglePin}
                dragId={dragId} dragOverId={dragOverId}
                handleDragStart={handleDragStart} handleDragOver={handleDragOver}
                handleDrop={handleDrop} handleDragEnd={handleDragEnd}
                isAdmin={isAdmin} folderPath={`${folderPath}/${subName}`}
                onFolderOpen={onFolderOpen}
                allUrls={allUrls} savedFolders={savedFolders}
                setSavedFolders={setSavedFolders} onUrlAdded={onUrlAdded}
                userToken={userToken}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({
  urls, activeUrl, onUrlSelect, onAddClick,
  onUserMgmtClick, onUrlMgmtClick, onOpenIframeTester,
  onAuditLogClick, onSettingsClick, onLogout, isCollapsed, onToggleCollapse,
  activeView, onSecurityClick, onActivityClick,
  onUrlAdded, onFolderOpen,
}) => {
  const auth         = useAuth();
  const user         = auth?.user;
  const isLoggingOut = auth?.isLoggingOut ?? false;
  const isAdmin      = user?.role === 'admin';

  const [prefs, setPrefs]               = useState({ favorites: [], pinned: [], urlOrder: [] });
  const [search, setSearch]             = useState('');
  const [viewMode, setViewMode]         = useState('all');
  const [dragId, setDragId]             = useState(null);
  const [dragOverId, setDragOverId]     = useState(null);
  const [orderedUrls, setOrderedUrls]   = useState([]);
  const [savedFolders, setSavedFolders] = useState(loadSavedFolders);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [folderModal, setFolderModal]             = useState({ open: false, path: '' });
  const [createFolderModal, setCreateFolderModal] = useState({ open: false, parentPath: '' });

  const saveOrderTimer = useRef(null);

  useEffect(() => {
    if (!user?.token) return;
    axios.get(`${API}/api/preferences`, {
      headers: { Authorization: `Bearer ${user.token}` },
    }).then(r => setPrefs(r.data)).catch(() => {});
  }, [user?.token]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!urls?.length) return;
    if (!prefs.urlOrder?.length) { 
      setOrderedUrls(urls);
      return;
    }
    const orderMap = Object.fromEntries(prefs.urlOrder.map((id, i) => [id, i]));
    const sorted = [...urls].sort((a, b) => (orderMap[a._id] ?? 9999) - (orderMap[b._id] ?? 9999));
    setOrderedUrls(sorted);
  }, [urls, prefs.urlOrder]);

  const filtered = orderedUrls.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.name.toLowerCase().includes(q) ||
      u.url.toLowerCase().includes(q) ||
      (u.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (u.folder || '').toLowerCase().includes(q);
    const matchFav = viewMode !== 'favorites' || prefs.favorites.includes(u._id);
    const matchPin = viewMode !== 'pinned'    || prefs.pinned.includes(u._id);
    return matchSearch && matchFav && matchPin;
  });

  const sortedFiltered = [
    ...filtered.filter(u =>  prefs.pinned.includes(u._id)),
    ...filtered.filter(u => !prefs.pinned.includes(u._id)),
  ];

  const rootUrls   = sortedFiltered.filter(u => !u.folder?.trim());
  const inFolders  = sortedFiltered.filter(u =>  u.folder?.trim());
  const folderTree = buildTree(inFolders, savedFolders);

  const toggleFav = async (e, urlId) => {
    e.stopPropagation();
    try {
      const { data } = await axios.patch(`${API}/api/preferences/favorite/${urlId}`, {},
        { headers: { Authorization: `Bearer ${user.token}` } });
      setPrefs(p => ({ ...p, favorites: data.favorites }));
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const togglePin = async (e, urlId) => {
    e.stopPropagation();
    try {
      const { data } = await axios.patch(`${API}/api/preferences/pin/${urlId}`, {},
        { headers: { Authorization: `Bearer ${user.token}` } });
      setPrefs(p => ({ ...p, pinned: data.pinned }));
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const handleDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e, id) => { e.preventDefault(); if (id !== dragId) setDragOverId(id); };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    setOrderedUrls(prev => {
      const arr  = [...prev];
      const from = arr.findIndex(u => u._id === dragId);
      const to   = arr.findIndex(u => u._id === targetId);
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      clearTimeout(saveOrderTimer.current);
      saveOrderTimer.current = setTimeout(() => {
        axios.patch(`${API}/api/preferences/order`, { urlOrder: arr.map(u => u._id) },
          { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => {});
      }, 600);
      return arr;
    });
    setDragId(null); setDragOverId(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  const addFolderPath = (path) => {
    if (!path.trim()) return;
    const updated = [...new Set([...savedFolders, path.trim()])];
    setSavedFolders(updated);
    saveFolders(updated);
  };

  const handleAddRootFolder = () => setCreateFolderModal({ open: true, parentPath: '' });
  const handleAddUrl        = () => onAddClick('');

  const toggleLeft = isCollapsed ? 62 : 262;

  return (
    <>
      {createFolderModal.open && (
        <CreateFolderModal
          parentPath={createFolderModal.parentPath}
          onClose={() => setCreateFolderModal({ open: false, parentPath: '' })}
          onCreate={(fullPath) => addFolderPath(fullPath)}
        />
      )}
      {folderModal.open && (
        <FolderAddUrlModal
          folderPath={folderModal.path}
          userToken={user?.token}
          onClose={() => setFolderModal({ open: false, path: '' })}
          onSuccess={() => { if (typeof onUrlAdded === 'function') onUrlAdded(); }}
        />
      )}

      {/* Toggle button */}
      <button
        onClick={onToggleCollapse}
        onMouseEnter={() => setHoveredItemId('toggle')}
        onMouseLeave={() => setHoveredItemId(null)}
        style={{
          position: 'fixed', left: toggleLeft, top: '50%', transform: 'translateY(-50%)',
          backgroundColor: 'white', border: '1px solid var(--border-color)',
          borderRadius: '50%', width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#1e293b', zIndex: 50,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
          opacity: hoveredItemId === 'toggle' ? 1 : 0.5,
        }}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
      </button>

      <aside className="glass-sidebar" style={{
        width: isCollapsed ? '80px' : '280px', height: '100vh',
        display: 'flex', flexDirection: 'column',
        padding: isCollapsed ? '20px 10px' : '20px',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative', overflow: 'visible',
      }}>

        {/* Logo + User info */}
        <div style={{ marginBottom: 20 }}>
          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            marginBottom: isCollapsed ? 0 : 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src={logo} alt="Hub" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              {!isCollapsed && (
                <span style={{ fontSize: '1.25rem', fontWeight: 800,
                  color: 'var(--text-main)', whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>
                  Hub
                </span>
              )}
            </div>
          </div>

          {/* User info card — only when expanded */}
          {!isCollapsed && user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10,
              backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
            }}>
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                backgroundColor: isAdmin ? 'rgba(37,99,235,0.12)' : 'rgba(168,85,247,0.12)',
                border: `1px solid ${isAdmin ? 'rgba(37,99,235,0.25)' : 'rgba(168,85,247,0.25)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.85rem',
                color: isAdmin ? 'var(--primary)' : '#a855f7',
              }}>
                {user.username?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {/* Name + role */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)',
                  margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.username}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                    backgroundColor: isAdmin ? 'rgba(37,99,235,0.1)' : 'rgba(168,85,247,0.1)',
                    color: isAdmin ? 'var(--primary)' : '#a855f7',
                    border: `1px solid ${isAdmin ? 'rgba(37,99,235,0.2)' : 'rgba(168,85,247,0.2)'}`,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {isAdmin ? '⚙ Admin' : '👤 User'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Collapsed — just show avatar */}
          {isCollapsed && user && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                backgroundColor: isAdmin ? 'rgba(37,99,235,0.12)' : 'rgba(168,85,247,0.12)',
                border: `1px solid ${isAdmin ? 'rgba(37,99,235,0.25)' : 'rgba(168,85,247,0.25)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.9rem',
                color: isAdmin ? 'var(--primary)' : '#a855f7',
              }} title={`${user.username} (${user.role})`}>
                {user.username?.charAt(0)?.toUpperCase() || '?'}
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-main)', opacity: 0.4 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search URLs, folders..."
              style={{ width: '100%', padding: '8px 30px 8px 32px', borderRadius: 8,
                border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)',
                color: 'var(--text-main)', fontSize: '0.82rem', boxSizing: 'border-box' }} />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-main)', opacity: 0.4, padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* View mode tabs */}
        {!isCollapsed && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {[
              ['all',       'All',  <Globe size={13} key="all" />],
              ['favorites', 'Fav',  <Star  size={13} key="fav" />],
              ['pinned',    'Pin',  <Pin   size={13} key="pin" />],
            ].map(([v, l, icon]) => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 5, padding: '5px 0', borderRadius: 6, border: 'none',
                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: viewMode === v ? 'var(--primary)' : 'var(--card-bg)',
                  color:           viewMode === v ? 'white' : 'var(--text-main)',
                  opacity:         viewMode === v ? 1 : 0.6 }}>
                {icon} {l}
              </button>
            ))}
          </div>
        )}

        {/* Add URL + Add Folder */}
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row',
            gap: 8, marginBottom: 20, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={handleAddUrl}
              style={{ width: isCollapsed ? 44 : '100%', height: isCollapsed ? 44 : 'auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: isCollapsed ? 0 : '9px 6px', borderRadius: 10,
                backgroundColor: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
              title="Add New URL">
              <Plus size={20} />
              {!isCollapsed && <span style={{ marginLeft: 6, fontWeight: 600 }}>Add URL</span>}
            </button>
            <button onClick={handleAddRootFolder}
              style={{ width: isCollapsed ? 44 : '100%', height: isCollapsed ? 44 : 'auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: isCollapsed ? 0 : '9px 6px', borderRadius: 10,
                backgroundColor: 'var(--card-bg)', color: 'var(--text-main)',
                border: '1px solid var(--border-color)', cursor: 'pointer' }}
              title="Add Folder">
              <Folder size={18} style={{ color: '#f59e0b' }} />
              {!isCollapsed && <span style={{ marginLeft: 6, fontWeight: 600 }}>Add Folder</span>}
            </button>
          </div>
        )}

        {/* URL list + Folder tree */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex',
          flexDirection: 'column', gap: 2, padding: '2px' }}>
          {rootUrls.map(item => (
            <UrlCard key={item._id} item={item} isCollapsed={isCollapsed}
              activeUrl={activeUrl} onUrlSelect={onUrlSelect}
              prefs={prefs} toggleFav={toggleFav} togglePin={togglePin}
              dragId={dragId} dragOverId={dragOverId}
              handleDragStart={handleDragStart} handleDragOver={handleDragOver}
              handleDrop={handleDrop} handleDragEnd={handleDragEnd} indent={0} />
          ))}

          {Object.keys(folderTree).length > 0 && (
            <div style={{ marginTop: rootUrls.length > 0 ? 8 : 0 }}>
              {Object.entries(folderTree).map(([folderName, data]) => (
                <FolderNode key={folderName} folderName={folderName} data={data}
                  level={0} isCollapsed={isCollapsed}
                  activeUrl={activeUrl} onUrlSelect={onUrlSelect}
                  prefs={prefs} toggleFav={toggleFav} togglePin={togglePin}
                  dragId={dragId} dragOverId={dragOverId}
                  handleDragStart={handleDragStart} handleDragOver={handleDragOver}
                  handleDrop={handleDrop} handleDragEnd={handleDragEnd}
                  isAdmin={isAdmin} folderPath={folderName}
                  onFolderOpen={onFolderOpen}
                  allUrls={urls}
                  savedFolders={savedFolders}
                  setSavedFolders={setSavedFolders}
                  onUrlAdded={onUrlAdded}
                  userToken={user?.token}
                />
              ))}
            </div>
          )}

          {rootUrls.length === 0 && Object.keys(folderTree).length === 0 && !isCollapsed && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', opacity: 0.4,
              textAlign: 'center', marginTop: 20 }}>
              {search ? 'No results.' : 'No URLs yet. Add a URL or create a folder.'}
            </p>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ marginTop: 'auto', paddingTop: 20,
          borderTop: '1px solid var(--border-color)',
          display: 'flex', flexDirection: 'column', gap: 15 }}>

          <div key="settings"
            onClick={() => { if (typeof onSettingsClick === 'function') onSettingsClick(); setSettingsOpen(o => !o); }}
            onMouseEnter={() => setHoveredItemId('Settings')}
            onMouseLeave={() => setHoveredItemId(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              color: hoveredItemId === 'Settings' || settingsOpen ? 'var(--primary)' : 'var(--text-main)',
              opacity: hoveredItemId === 'Settings' || settingsOpen ? 1 : 0.75,
              transition: 'opacity 0.2s ease',
              justifyContent: isCollapsed ? 'center' : 'flex-start' }}
            title={isCollapsed ? 'Settings' : ''}>
            <Settings size={18} />
            {!isCollapsed && (
              <span style={{ fontSize: '0.88rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Settings
                <ChevronRight size={14} style={{ transform: settingsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
              </span>
            )}
          </div>

          {settingsOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: isCollapsed ? 0 : 28 }}>
              {[
                [onSettingsClick, <Shield      size={16} />, 'TFA / MFA',     true],
                [onSecurityClick, <HistoryIcon size={16} />, 'Login History', isAdmin],
                [onUserMgmtClick, <Settings    size={16} />, 'Manage Users',  isAdmin],
                [onUrlMgmtClick,  <Globe       size={16} />, 'Manage URLs',   isAdmin],
                [onAuditLogClick, <Shield      size={16} />, 'Audit Logs',    isAdmin],
                [onActivityClick, <Activity    size={16} />, 'Activity',      isAdmin],
              ].filter(([, , , show]) => show).map(([fn, icon, label]) => {
                const isHov    = hoveredItemId === label;
                const isActive = (label === 'TFA / MFA' && activeView === 'settings') ||
                                 (label === 'Login History' && activeView === 'security');
                return (
                  <div key={label} onClick={fn}
                    onMouseEnter={() => setHoveredItemId(label)}
                    onMouseLeave={() => setHoveredItemId(null)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      color: isActive ? 'var(--primary)' : 'var(--text-main)',
                      opacity: isActive || isHov ? 1 : 0.8,
                      transition: 'opacity 0.2s ease',
                      justifyContent: isCollapsed ? 'center' : 'flex-start' }}
                    title={isCollapsed ? label : ''}>
                    {icon}
                    {!isCollapsed && <span style={{ fontSize: '0.83rem', fontWeight: 500 }}>{label}</span>}
                  </div>
                );
              })}
            </div>
          )}

          <div key="iframe" onClick={onOpenIframeTester}
            onMouseEnter={() => setHoveredItemId('Iframe Tester')}
            onMouseLeave={() => setHoveredItemId(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              color: activeView === 'iframeTester' ? 'var(--primary)' : 'var(--text-main)',
              opacity: activeView === 'iframeTester' || hoveredItemId === 'Iframe Tester' ? 1 : 0.75,
              transition: 'opacity 0.2s ease',
              justifyContent: isCollapsed ? 'center' : 'flex-start' }}
            title={isCollapsed ? 'Iframe Tester' : ''}>
            <FlaskConical size={18} />
            {!isCollapsed && <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Iframe Tester</span>}
          </div>

          <div
            onClick={isLoggingOut ? undefined : onLogout}
            onMouseEnter={() => setHoveredItemId('Logout')}
            onMouseLeave={() => setHoveredItemId(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 10,
              color: '#ef4444', cursor: isLoggingOut ? 'not-allowed' : 'pointer',
              opacity: hoveredItemId === 'Logout' ? 1 : 0.5,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              transition: 'opacity 0.2s ease' }}
            title={isCollapsed ? 'Logout' : ''}>
            <LogOut size={18} />
            {!isCollapsed && (
              <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            )}
          </div>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;