import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import {
  Folder, FolderOpen, Plus, ArrowLeft, ChevronRight,
  Globe, Star, Pin, X, Check, Search,
  RefreshCw, MoreHorizontal, ExternalLink, Home,
  Image, Trash2, FolderPlus, Layers,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const FOLDERS_KEY = '__hub_folders__';

const loadSavedFolders = () => { try { return JSON.parse(localStorage.getItem(FOLDERS_KEY) || '[]'); } catch { return []; } };
const saveFoldersList  = (list) => localStorage.setItem(FOLDERS_KEY, JSON.stringify(list));

/* ─── Styles ─────────────────────────────────────────────────────────── */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    .fp * { box-sizing: border-box; font-family: 'Inter', sans-serif; }

    @keyframes fp-in   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
    @keyframes fp-card { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
    @keyframes fp-mod  { from{opacity:0;transform:scale(.96) translateY(12px)} to{opacity:1;transform:none} }
    @keyframes fp-spin { to{transform:rotate(360deg)} }
    @keyframes fp-pop  { 0%{transform:scale(.85);opacity:0} 70%{transform:scale(1.03)} 100%{transform:none;opacity:1} }
    @keyframes fp-pulse{ 0%,100%{opacity:1} 50%{opacity:.45} }

    .fp { animation: fp-in .3s cubic-bezier(.22,1,.36,1) both; }

    /* ── Buttons ── */
    .fp-btn {
      display:inline-flex; align-items:center; gap:8px;
      padding:9px 18px; border-radius:10px; border:none; cursor:pointer;
      font-size:0.83rem; font-weight:500; letter-spacing:-0.1px;
      transition:all .16s cubic-bezier(.22,1,.36,1);
      font-family:'Inter',sans-serif; line-height:1;
    }
    .fp-btn-dark {
      background:linear-gradient(135deg,#4f46e5,#4338ca);
      color:#fff;
      box-shadow:0 1px 3px rgba(79,70,229,.35), inset 0 1px 0 rgba(255,255,255,.1);
    }
    .fp-btn-dark:hover {
      background:linear-gradient(135deg,#5b52f0,#4f46e5);
      transform:translateY(-1px);
      box-shadow:0 4px 14px rgba(79,70,229,.45);
    }
    .fp-btn-ghost {
      background:#fff; color:#374151;
      border:1px solid #e2e8f0;
      box-shadow:0 1px 2px rgba(0,0,0,.05);
    }
    .fp-btn-ghost:hover {
      border-color:#c7d2fe; color:#4f46e5; background:#f5f3ff;
      transform:translateY(-1px); box-shadow:0 3px 8px rgba(79,70,229,.12);
    }
    .fp-btn-amber {
      background:linear-gradient(135deg,#f59e0b,#d97706);
      color:#fff;
      box-shadow:0 1px 3px rgba(245,158,11,.35), inset 0 1px 0 rgba(255,255,255,.15);
    }
    .fp-btn-amber:hover {
      background:linear-gradient(135deg,#fbbf24,#f59e0b);
      transform:translateY(-1px);
      box-shadow:0 4px 14px rgba(245,158,11,.4);
    }
    .fp-btn:active { transform:none !important; box-shadow:none !important; }

    .fp-icon-btn {
      background:none; border:none; cursor:pointer; padding:7px;
      border-radius:8px; display:flex; align-items:center; justify-content:center;
      transition:all .12s; color:#94a3b8;
    }
    .fp-icon-btn:hover { background:#f1f5f9; color:#475569; }

    /* ── Folder card ── */
    .fp-folder-card {
      display:flex; align-items:center; gap:14px;
      padding:16px 18px; border-radius:14px; cursor:pointer;
      border:1px solid #e2e8f0; background:#fff;
      transition:all .2s cubic-bezier(.22,1,.36,1);
      position:relative; overflow:hidden;
      box-shadow:0 1px 3px rgba(0,0,0,.05);
    }
    .fp-folder-card::after {
      content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
      background:linear-gradient(to bottom,#f59e0b,#d97706);
      border-radius:14px 0 0 14px; opacity:0; transition:opacity .2s;
    }
    .fp-folder-card:hover { border-color:#fcd34d; transform:translateY(-2px); box-shadow:0 8px 24px rgba(245,158,11,.15),0 2px 6px rgba(0,0,0,.05); }
    .fp-folder-card:hover::after { opacity:1; }

    /* ── URL card ── */
    .fp-url-card {
      display:flex; align-items:center; gap:15px;
      padding:14px 18px; border-radius:14px; cursor:pointer;
      border:1px solid #e2e8f0; background:#fff;
      transition:all .18s cubic-bezier(.22,1,.36,1);
      position:relative; overflow:visible;
      box-shadow:0 1px 2px rgba(0,0,0,.04);
    }
    .fp-url-card:hover {
      border-color:#c7d2fe;
      transform:translateX(3px);
      box-shadow:0 4px 16px rgba(79,70,229,.1),0 1px 4px rgba(0,0,0,.05);
      background:#fdfcff;
    }
    .fp-url-card.is-pinned {
      background:linear-gradient(to right,#fafafe,#fff);
      border-color:#c7d2fe;
    }

    /* ── Portal Dropdown ── */
    .fp-portal-dropdown {
      position:fixed; z-index:99999;
      background:#fff; border:1px solid #e2e8f0;
      border-radius:12px; padding:4px;
      min-width:175px;
      box-shadow:0 10px 40px rgba(0,0,0,.14),0 2px 8px rgba(0,0,0,.06);
      animation:fp-pop .14s cubic-bezier(.22,1,.36,1) both;
    }
    .fp-drop-item {
      display:flex; align-items:center; gap:9px;
      width:100%; padding:9px 12px; background:none; border:none;
      cursor:pointer; font-size:0.81rem; color:#374151;
      border-radius:8px; text-align:left;
      transition:background .1s; font-family:'Inter',sans-serif;
    }
    .fp-drop-item:hover { background:#f8fafc; color:#1e293b; }
    .fp-drop-item.red { color:#dc2626; }
    .fp-drop-item.red:hover { background:#fef2f2; }
    .fp-divider { height:1px; background:#f1f5f9; margin:3px 0; }

    /* ── Tags ── */
    .fp-tag {
      display:inline-flex; align-items:center;
      font-size:0.66rem; padding:3px 8px; border-radius:6px;
      font-family:'JetBrains Mono',monospace; letter-spacing:.2px;
      border:1px solid #e2e8f0; color:#64748b; background:#f8fafc;
      cursor:default; user-select:none; transition:all .13s; font-weight:500;
    }
    .fp-tag.click:hover, .fp-tag.on {
      border-color:#a5b4fc; color:#4f46e5; background:#eef2ff; cursor:pointer;
    }

    /* ── Search ── */
    .fp-search-wrap { position:relative; }
    .fp-search-inp {
      padding:9px 14px 9px 36px; border-radius:10px;
      border:1px solid #e2e8f0; background:#f8fafc; color:#1e293b;
      font-size:0.83rem; outline:none; width:100%;
      transition:all .15s; font-family:'Inter',sans-serif;
    }
    .fp-search-inp:focus {
      border-color:#a5b4fc; background:#fff;
      box-shadow:0 0 0 3px rgba(99,102,241,.1);
    }
    .fp-search-ico { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; }

    /* ── Section header ── */
    .fp-sec {
      font-size:0.65rem; font-weight:700; letter-spacing:1.4px;
      text-transform:uppercase; color:#94a3b8;
      display:flex; align-items:center; gap:10px; margin-bottom:14px;
    }
    .fp-sec::after { content:''; flex:1; height:1px; background:#f1f5f9; }
    .fp-sec-badge {
      font-size:0.62rem; font-weight:700; padding:1px 7px;
      border-radius:20px; background:#eef2ff; color:#6366f1;
    }

    /* ── Tabs ── */
    .fp-tabs { display:flex; gap:2px; padding:4px; background:#f1f5f9; border-radius:12px; }
    .fp-tab {
      padding:8px 18px; border-radius:9px; border:none; cursor:pointer;
      font-size:0.82rem; font-weight:500; color:#64748b; background:transparent;
      transition:all .15s; font-family:'Inter',sans-serif; letter-spacing:-.1px;
    }
    .fp-tab:hover { color:#374151; }
    .fp-tab.on {
      background:#fff; color:#1e293b; font-weight:600;
      box-shadow:0 1px 4px rgba(0,0,0,.1);
    }

    /* ── Modal ── */
    .fp-overlay {
      position:fixed; inset:0; z-index:9999;
      background:rgba(15,23,42,.5); backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center; padding:20px;
    }
    .fp-modal {
      background:#fff; border-radius:20px; padding:30px; width:100%;
      border:1px solid #e2e8f0;
      box-shadow:0 25px 80px rgba(0,0,0,.2); position:relative;
      animation:fp-mod .22s cubic-bezier(.22,1,.36,1) both;
    }
    .fp-label {
      font-size:0.72rem; font-weight:600; color:#64748b;
      display:block; margin-bottom:6px; letter-spacing:.3px; text-transform:uppercase;
    }
    .fp-input {
      width:100%; padding:10px 13px; border-radius:10px;
      border:1px solid #e2e8f0; background:#f8fafc; color:#1e293b;
      font-size:0.87rem; outline:none;
      transition:all .15s; font-family:'Inter',sans-serif;
    }
    .fp-input:focus {
      border-color:#a5b4fc; background:#fff;
      box-shadow:0 0 0 3px rgba(99,102,241,.1);
    }
    .fp-input-ro {
      background:#fffbeb; color:#92400e; cursor:not-allowed;
      border-color:#fde68a !important;
    }

    /* ── Pin bar ── */
    .fp-pin-bar {
      position:absolute; top:0; left:0; bottom:0; width:3px;
      border-radius:14px 0 0 14px;
      background:linear-gradient(to bottom,#818cf8,#6366f1);
    }

    /* ── Empty state ── */
    .fp-empty {
      padding:60px 28px; text-align:center;
      border:1.5px dashed #cbd5e1; border-radius:18px;
      background:linear-gradient(135deg,#f8fafc,#f1f5f9);
    }

    .fp-crumb { transition:color .12s; cursor:pointer; }
    .fp-crumb:hover { color:#4f46e5 !important; }

    /* ── Confirm overlay ── */
    .fp-confirm-overlay {
      position:fixed; inset:0; z-index:10000;
      background:rgba(15,23,42,.55); backdrop-filter:blur(6px);
      display:flex; align-items:center; justify-content:center; padding:20px;
    }

    /* ── Toast ── */
    .fp-toast {
      position:fixed; top:20px; right:20px; z-index:10001;
      display:flex; align-items:center; gap:10px;
      padding:12px 16px; border-radius:12px; min-width:230px;
      box-shadow:0 8px 28px rgba(0,0,0,.12);
      animation:fp-card .22s ease both;
    }

    .fp-hdot { display:inline-block; border-radius:50%; flex-shrink:0; }
    .fp-fav-box { border-radius:10px; overflow:hidden; border:1px solid #f1f5f9; flex-shrink:0; }
    .fp-fav-fallback {
      display:flex; align-items:center; justify-content:center;
      font-weight:600; background:#eef2ff; color:#4f46e5;
      border-radius:10px; flex-shrink:0;
    }

    /* ── Stat card ── */
    .fp-stat {
      display:flex; flex-direction:column; align-items:center;
      padding:12px 18px; border-radius:12px; min-width:64px;
      transition:transform .15s, box-shadow .15s;
    }
    .fp-stat:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,.08); }

    .fp-more-btn-active { background:#f1f5f9 !important; color:#475569 !important; }

    /* ── Scrollbar ── */
    .fp ::-webkit-scrollbar { width:5px; height:5px; }
    .fp ::-webkit-scrollbar-track { background:transparent; }
    .fp ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
    .fp ::-webkit-scrollbar-thumb:hover { background:#94a3b8; }
  `}</style>
);

/* ─── Portal Dropdown ────────────────────────────────────────────────── */
const PortalDropdown = ({ anchorRef, open, onClose, children }) => {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const dropRef = useRef(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const dropW = 178;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > 180 ? rect.bottom + 6 : rect.top - 6 - 160;
    const left = Math.min(rect.right - dropW, window.innerWidth - dropW - 8);
    setPos({ top, left });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) onClose();
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = () => onClose();
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      ref={dropRef}
      className="fp-portal-dropdown"
      style={{ top: pos.top, left: pos.left }}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};

/* ─── Favicon ────────────────────────────────────────────────────────── */
const Favicon = ({ src, name, size = 36 }) => {
  const [err, setErr] = useState(false);
  const letter = name?.charAt(0)?.toUpperCase() || '?';
  if (!src || err) return (
    <div className="fp-fav-fallback" style={{ width:size, height:size, fontSize:size*.36 }}>{letter}</div>
  );
  return <img src={src} alt={name} onError={() => setErr(true)}
    className="fp-fav-box" style={{ width:size, height:size, objectFit:'contain' }}/>;
};

/* ─── Health dot ─────────────────────────────────────────────────────── */
const HDot = ({ status }) => {
  const cfg = {
    online:  ['#10b981', '0 0 0 3px rgba(16,185,129,.18)'],
    offline: ['#f43f5e', '0 0 0 3px rgba(244,63,94,.14)'],
  };
  const [c, s] = cfg[status] || ['#cbd5e1', 'none'];
  return <span className="fp-hdot" style={{ width:8, height:8, background:c, boxShadow:s }}/>;
};

/* ─── Toast ──────────────────────────────────────────────────────────── */
const Toast = ({ msg, type, onClose }) => {
  if (!msg) return null;
  const m = {
    success: ['#f0fdf4', '#bbf7d0', '#15803d'],
    error:   ['#fff1f2', '#fecdd3', '#be123c'],
    warn:    ['#fffbeb', '#fde68a', '#92400e'],
  };
  const [bg, border, color] = m[type] || m.warn;
  return (
    <div className="fp-toast" style={{ backgroundColor:bg, border:`1px solid ${border}` }}>
      <span style={{ fontSize:'0.82rem', fontWeight:500, color, flex:1 }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color, opacity:.55, fontSize:'1.1rem', lineHeight:1 }}>×</button>
    </div>
  );
};

/* ─── Confirm dialog ─────────────────────────────────────────────────── */
const Confirm = ({ open, text, onOk, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fp-confirm-overlay" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'#fff', borderRadius:18, padding:28, maxWidth:320, width:'90%',
        boxShadow:'0 24px 72px rgba(0,0,0,.2)', textAlign:'center',
        border:'1px solid #f1f5f9',
        animation:'fp-mod .18s ease both',
      }}>
        <div style={{
          width:48, height:48, borderRadius:14, background:'#fff1f2',
          border:'1px solid #fecdd3',
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px',
        }}>
          <Trash2 size={20} color="#be123c"/>
        </div>
        <p style={{ fontSize:'0.92rem', fontWeight:600, color:'#1e293b', margin:'0 0 6px' }}>Delete URL?</p>
        <p style={{ fontSize:'0.79rem', color:'#64748b', margin:'0 0 22px', lineHeight:1.5 }}>{text}<br/>This cannot be undone.</p>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onCancel} className="fp-btn fp-btn-ghost" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button onClick={onOk} style={{
            flex:1, display:'flex', alignItems:'center', justifyContent:'center',
            padding:'10px', borderRadius:10, cursor:'pointer',
            background:'linear-gradient(135deg,#f43f5e,#e11d48)',
            border:'none', color:'#fff', fontSize:'0.84rem', fontWeight:600,
            boxShadow:'0 2px 8px rgba(244,63,94,.3)',
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Modal wrapper ──────────────────────────────────────────────────── */
const Modal = ({ onClose, children, maxWidth=460 }) => (
  <div className="fp-overlay" onClick={onClose}>
    <div className="fp-modal" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="fp-icon-btn"
        style={{ position:'absolute', top:14, right:14, opacity:.5 }}><X size={15}/></button>
      {children}
    </div>
  </div>
);

/* ─── Create Subfolder modal ─────────────────────────────────────────── */
const SubfolderModal = ({ parentPath, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [err, setErr]   = useState('');
  const submit = e => {
    e.preventDefault();
    const t = name.trim();
    if (!t) { setErr('Name required.'); return; }
    onCreate(parentPath ? `${parentPath}/${t}` : t);
    onClose();
  };
  return (
    <Modal onClose={onClose} maxWidth={400}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:26 }}>
        <div style={{
          width:46, height:46, borderRadius:13,
          background:'linear-gradient(135deg,#fffbeb,#fef3c7)',
          border:'1px solid #fde68a',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 2px 8px rgba(245,158,11,.2)',
        }}>
          <FolderPlus size={20} color="#d97706"/>
        </div>
        <div>
          <h3 style={{ fontSize:'1rem', fontWeight:600, color:'#1e293b', margin:0 }}>New Subfolder</h3>
          <p style={{ fontSize:'0.73rem', color:'#94a3b8', margin:'3px 0 0' }}>
            Inside <strong style={{ color:'#475569', fontWeight:500 }}>{parentPath}</strong>
          </p>
        </div>
      </div>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <input autoFocus value={name} onChange={e => { setName(e.target.value); setErr(''); }}
          placeholder="e.g. Frontend, Reports…" className="fp-input"
          style={err ? { borderColor:'#f43f5e' } : {}}/>
        {err && <p style={{ fontSize:'0.73rem', color:'#f43f5e', margin:'-6px 0 0' }}>{err}</p>}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button type="button" onClick={onClose} className="fp-btn fp-btn-ghost">Cancel</button>
          <button type="submit" className="fp-btn fp-btn-amber"><FolderPlus size={13}/> Create</button>
        </div>
      </form>
    </Modal>
  );
};

/* ─── Add URL modal ──────────────────────────────────────────────────── */
const AddUrlModal = ({ folderPath, onClose, onSuccess, userToken }) => {
  const [name, setName]   = useState('');
  const [url,  setUrl]    = useState('');
  const [tags, setTags]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');

  const submit = async e => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) { setErr('Name and URL required.'); return; }
    setBusy(true); setErr('');
    try {
      await axios.post(`${API}/api/urls`,
        { name: name.trim(), url: url.trim(), folder: folderPath, tags: tags.split(',').map(t=>t.trim()).filter(Boolean) },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      onSuccess(); onClose();
    } catch(e) { setErr(e?.response?.data?.message || 'Failed to add URL.'); }
    finally    { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} maxWidth={480}>
      <div style={{ marginBottom:24 }}>
        <h3 style={{ fontSize:'1.05rem', fontWeight:600, color:'#1e293b', margin:'0 0 10px' }}>Add URL</h3>
        <span style={{
          display:'inline-flex', alignItems:'center', gap:5, padding:'4px 11px', borderRadius:8,
          background:'#fffbeb', color:'#92400e', fontSize:'0.71rem', fontWeight:500,
          border:'1px solid #fde68a', letterSpacing:'.1px',
        }}>
          <Folder size={11}/> {folderPath}
        </span>
      </div>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:15 }}>
        {[
          { lbl:'Site Name *', val:name, set:setName, ph:'e.g. Google Drive', type:'text' },
          { lbl:'URL *',       val:url,  set:setUrl,  ph:'https://example.com', type:'url' },
        ].map(({ lbl, val, set, ph, type }) => (
          <div key={lbl}>
            <label className="fp-label">{lbl}</label>
            <input type={type} value={val} onChange={e=>{ set(e.target.value); setErr(''); }}
              placeholder={ph} className="fp-input"/>
          </div>
        ))}
        <div>
          <label className="fp-label">Tags <span style={{ opacity:.5, fontWeight:400, textTransform:'none', letterSpacing:0 }}>(comma separated)</span></label>
          <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="dev, internal" className="fp-input"/>
        </div>
        <div>
          <label className="fp-label">Folder</label>
          <input value={folderPath} readOnly className="fp-input fp-input-ro"/>
        </div>
        {err && <p style={{ fontSize:'0.76rem', color:'#f43f5e', margin:'-5px 0 0' }}>{err}</p>}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
          <button type="button" onClick={onClose} className="fp-btn fp-btn-ghost">Cancel</button>
          <button type="submit" disabled={busy} className="fp-btn fp-btn-dark" style={{ opacity:busy ? .7 : 1 }}>
            {busy ? 'Adding…' : <><Check size={13}/> Add URL</>}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* ─── Subfolder card ─────────────────────────────────────────────────── */
const SubCard = ({ name, urlCount, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <div className="fp-folder-card" onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ minWidth:200, flex:'1 1 200px', maxWidth:280 }}>
      <div style={{
        width:42, height:42, borderRadius:11, flexShrink:0,
        background: hov ? 'linear-gradient(135deg,#fef3c7,#fde68a)' : 'linear-gradient(135deg,#fffbeb,#fef3c7)',
        border:`1px solid ${hov?'#fbbf24':'#fde68a'}`,
        display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s',
        boxShadow: hov ? '0 4px 12px rgba(245,158,11,.2)' : 'none',
      }}>
        {hov ? <FolderOpen size={19} color="#b45309"/> : <Folder size={19} color="#d97706"/>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:'0.88rem', fontWeight:600, color:'#1e293b', margin:0,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</p>
        <p style={{ fontSize:'0.71rem', color:'#94a3b8', margin:'3px 0 0', fontWeight:500 }}>
          {urlCount} URL{urlCount!==1?'s':''}
        </p>
      </div>
      <ChevronRight size={14} style={{ color:'#cbd5e1', flexShrink:0 }}/>
    </div>
  );
};

/* ─── URL card ───────────────────────────────────────────────────────── */
const UrlCard = ({ url, onSelect, onToggleFav, onTogglePin, isFav, isPinned, isAdmin, onPing, onDelete, onRefreshFavicon }) => {
  const [menu, setMenu] = useState(false);
  const [ping, setPing] = useState(false);
  const btnRef = useRef(null);

  const closeMenu = useCallback(() => setMenu(false), []);

  const doPing = async e => {
    e.stopPropagation(); setPing(true);
    await onPing?.(url._id); setPing(false); setMenu(false);
  };

  return (
    <div
      className={`fp-url-card${isPinned?' is-pinned':''}`}
      onClick={() => onSelect(url)}
    >
      {isPinned && <div className="fp-pin-bar"/>}

      <Favicon src={url.favicon} name={url.name} size={38}/>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
          <p style={{ fontSize:'0.88rem', fontWeight:600, color:'#1e293b', margin:0,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{url.name}</p>
          {isPinned && (
            <span style={{
              fontSize:'0.59rem', padding:'2px 7px', borderRadius:5, flexShrink:0,
              background:'#eef2ff', color:'#4f46e5', fontWeight:700, letterSpacing:'.5px',
              border:'1px solid #c7d2fe',
            }}>
              PINNED
            </span>
          )}
        </div>
        <p style={{
          fontSize:'0.71rem', color:'#94a3b8', margin:'0 0 6px',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          fontFamily:"'JetBrains Mono',monospace", fontWeight:400,
        }}>{url.url}</p>
        {url.tags?.length > 0 && (
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {url.tags.map(t => <span key={t} className="fp-tag">{t}</span>)}
          </div>
        )}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}
        onClick={e => e.stopPropagation()}>

        <HDot status={url.healthStatus}/>

        <button className="fp-icon-btn" onClick={() => onToggleFav?.(url._id)}
          style={{ color: isFav ? '#f59e0b' : '#94a3b8' }}>
          <Star size={15} fill={isFav?'#f59e0b':'none'} stroke={isFav?'#f59e0b':'#94a3b8'}/>
        </button>

        <button className="fp-icon-btn" onClick={() => onTogglePin?.(url._id)}
          style={{ color: isPinned ? '#6366f1' : '#94a3b8' }}>
          <Pin size={15} fill={isPinned?'#6366f1':'none'} stroke={isPinned?'#6366f1':'#94a3b8'}/>
        </button>

        {isAdmin && (
          <button className="fp-icon-btn"
            onClick={e => { e.stopPropagation(); onDelete?.(url._id, url.name); }}
            style={{ color:'#f43f5e' }} title="Delete">
            <Trash2 size={15}/>
          </button>
        )}

        {isAdmin && (
          <>
            <button
              ref={btnRef}
              className={`fp-icon-btn${menu ? ' fp-more-btn-active' : ''}`}
              onClick={e => { e.stopPropagation(); setMenu(v => !v); }}
              title="More options"
            >
              <MoreHorizontal size={16}/>
            </button>

            <PortalDropdown anchorRef={btnRef} open={menu} onClose={closeMenu}>
              <button onClick={doPing} disabled={ping} className="fp-drop-item">
                <RefreshCw size={13} style={{ animation: ping ? 'fp-spin 1s linear infinite' : 'none' }}/>
                {ping ? 'Pinging…' : 'Ping'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onRefreshFavicon?.(url._id); setMenu(false); }}
                className="fp-drop-item"
              >
                <Image size={13}/> Refresh favicon
              </button>
              <div className="fp-divider"/>
              <button
                onClick={e => { e.stopPropagation(); window.open(url.url, '_blank'); setMenu(false); }}
                className="fp-drop-item"
              >
                <ExternalLink size={13}/> Open in tab
              </button>
            </PortalDropdown>
          </>
        )}

        <ChevronRight size={14} style={{ color:'#e2e8f0' }}/>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   Main FolderPage
══════════════════════════════════════════════════════════════════════ */
const FolderPage = ({
  folderPath,
  urls = [],
  favorites = [],
  pinned = [],
  onBack,
  onFolderOpen,
  onUrlSelect,
  onUrlAdded,
  onToggleFav,
  onTogglePin,
  onPing,
  onRefreshFavicon: onRefreshFaviconProp,
  userToken,
  isAdmin = false,
}) => {
  const [addUrlOpen,   setAddUrlOpen]  = useState(false);
  const [addSubOpen,   setAddSubOpen]  = useState(false);
  const [savedFolders, setSaved]       = useState(loadSavedFolders);
  const [search,       setSearch]      = useState('');
  const [activeTag,    setActiveTag]   = useState(null);
  const [filterFav,    setFilterFav]   = useState(false);
  const [activeTab,    setActiveTab]   = useState('urls');
  const [confirm,      setConfirm]     = useState({ open:false, id:null, name:'' });
  const [toast,        setToast]       = useState({ msg:'', type:'' });

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'' }), 3000);
  };

  const segments   = folderPath.split('/').filter(Boolean);
  const folderUrls = urls.filter(u => u.folder === folderPath);

  const visible = folderUrls.filter(u => {
    if (filterFav && !favorites.includes(u._id)) return false;
    if (activeTag  && !u.tags?.includes(activeTag)) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.url?.toLowerCase().includes(q) || u.tags?.some(t=>t.toLowerCase().includes(q));
    }
    return true;
  });

  const sorted = [...visible].sort((a,b) => (pinned.includes(a._id)?0:1)-(pinned.includes(b._id)?0:1));
  const allTags = [...new Set(folderUrls.flatMap(u=>u.tags||[]))];

  const allPaths = [...new Set([
    ...savedFolders,
    ...urls.filter(u=>u.folder?.trim()).map(u=>u.folder),
  ])];

  const subs = [...new Set(
    allPaths
      .filter(p=>p.startsWith(folderPath+'/')&&!p.slice(folderPath.length+1).includes('/'))
      .map(p=>p.slice(folderPath.length+1))
  )];

  const addSub = fp => {
    const upd = [...new Set([...savedFolders, fp])];
    setSaved(upd); saveFoldersList(upd); showToast('Subfolder created');
  };

  const subCount = s => {
    const sp = `${folderPath}/${s}`;
    return urls.filter(u=>u.folder===sp||u.folder?.startsWith(sp+'/')).length;
  };

  const handleDelete = (id, name) => setConfirm({ open:true, id, name });

  const doDelete = async () => {
    const { id, name } = confirm;
    setConfirm({ open:false, id:null, name:'' });
    try {
      await axios.delete(`${API}/api/urls/${id}`, { headers:{ Authorization:`Bearer ${userToken}` } });
      showToast(`"${name}" deleted`); onUrlAdded?.();
    } catch { showToast('Delete failed','error'); }
  };

  const handleRefreshFavicon = async id => {
    try {
      await axios.post(`${API}/api/admin/urls/${id}/refresh-favicon`,{},{ headers:{ Authorization:`Bearer ${userToken}` } });
      showToast('Favicon refreshed'); onRefreshFaviconProp?.(id);
    } catch { showToast('Favicon refresh failed','error'); }
  };

  const stats = [
    { label:'Total',   val:folderUrls.length,                                     color:'#4f46e5', bg:'#eef2ff', border:'#c7d2fe' },
    { label:'Online',  val:folderUrls.filter(u=>u.healthStatus==='online').length, color:'#059669', bg:'#f0fdf4', border:'#a7f3d0' },
    { label:'Pinned',  val:folderUrls.filter(u=>pinned.includes(u._id)).length,    color:'#0284c7', bg:'#f0f9ff', border:'#bae6fd' },
    { label:'Favs',    val:folderUrls.filter(u=>favorites.includes(u._id)).length, color:'#d97706', bg:'#fffbeb', border:'#fde68a' },
  ];

  const tabs = [
    { key:'urls', label:'URLs',       count:folderUrls.length },
    { key:'subs', label:'Subfolders', count:subs.length },
  ];

  return (
    <>
      <GlobalStyle/>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg:'', type:'' })}/>
      <Confirm open={confirm.open} text={`Delete "${confirm.name}"?`} onOk={doDelete}
        onCancel={() => setConfirm({ open:false, id:null, name:''})}/>

      {addUrlOpen && (
        <AddUrlModal folderPath={folderPath} userToken={userToken}
          onClose={() => setAddUrlOpen(false)}
          onSuccess={() => { onUrlAdded?.(); showToast('URL added'); }}/>
      )}
      {addSubOpen && (
        <SubfolderModal parentPath={folderPath} onClose={() => setAddSubOpen(false)} onCreate={addSub}/>
      )}

      <div className="fp" style={{
        flex:1, overflowY:'auto', padding:'28px 36px 64px',
        background:'#f8fafc', minHeight:'100vh',
      }}>

        {/* ── Top bar ── */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom:24, gap:12, flexWrap:'wrap',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
            <button onClick={onBack} className="fp-icon-btn" style={{ color:'#64748b', marginRight:2 }}>
              <ArrowLeft size={17}/>
            </button>
            <span className="fp-crumb" onClick={onBack}
              style={{ fontSize:'0.81rem', color:'#94a3b8', display:'flex', alignItems:'center', gap:4 }}>
              <Home size={13}/> Home
            </span>
            {segments.map((seg,i) => {
              const path   = segments.slice(0,i+1).join('/');
              const isLast = i===segments.length-1;
              return (
                <React.Fragment key={path}>
                  <ChevronRight size={11} style={{ color:'#cbd5e1' }}/>
                  <span className={isLast?'':'fp-crumb'}
                    onClick={() => !isLast && onFolderOpen(path)}
                    style={{
                      fontSize:'0.81rem',
                      color:isLast?'#1e293b':'#94a3b8',
                      fontWeight:isLast?600:400,
                      cursor:isLast?'default':'pointer',
                    }}>
                    {seg}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
          {isAdmin && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setAddSubOpen(true)} className="fp-btn fp-btn-ghost" style={{ fontSize:'0.81rem' }}>
                <Folder size={13} style={{ color:'#d97706' }}/> New Subfolder
              </button>
              <button onClick={() => setAddUrlOpen(true)} className="fp-btn fp-btn-dark">
                <Plus size={14}/> Add URL
              </button>
            </div>
          )}
        </div>

        {/* ── Hero card ── */}
        <div style={{
          background:'#fff', border:'1px solid #e2e8f0', borderRadius:18,
          padding:'24px 28px', marginBottom:20,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexWrap:'wrap', gap:16,
          boxShadow:'0 1px 4px rgba(0,0,0,.05)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:18 }}>
            <div style={{
              width:60, height:60, borderRadius:16,
              background:'linear-gradient(135deg,#fffbeb,#fef3c7)',
              border:'1px solid #fde68a', display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 14px rgba(245,158,11,.18)',
            }}>
              <FolderOpen size={28} color="#d97706"/>
            </div>
            <div>
              <h1 style={{
                fontSize:'1.6rem', fontWeight:700, color:'#0f172a', margin:0,
                letterSpacing:'-0.6px', lineHeight:1.1,
              }}>
                {segments[segments.length-1]}
              </h1>
              <p style={{
                fontSize:'0.73rem', color:'#94a3b8', margin:'5px 0 0',
                fontFamily:"'JetBrains Mono',monospace", letterSpacing:'.1px',
              }}>
                /{folderPath}
              </p>
            </div>
          </div>

          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {stats.map(({ label, val, color, bg, border }) => (
              <div key={label} className="fp-stat" style={{
                background:bg, border:`1px solid ${border}`,
              }}>
                <span style={{ fontSize:'1.3rem', fontWeight:700, color, lineHeight:1 }}>{val}</span>
                <span style={{ fontSize:'0.62rem', color, opacity:.75, marginTop:4, letterSpacing:'.3px', fontWeight:600, textTransform:'uppercase' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs + search row ── */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom:18, gap:10, flexWrap:'wrap',
        }}>
          <div className="fp-tabs">
            {tabs.map(t => (
              <button key={t.key} className={`fp-tab${activeTab===t.key?' on':''}`}
                onClick={() => setActiveTab(t.key)}>
                {t.label}
                <span style={{
                  marginLeft:6, fontSize:'0.67rem', padding:'1px 7px', borderRadius:9,
                  background: activeTab===t.key ? '#eef2ff' : '#e2e8f0',
                  color: activeTab===t.key ? '#4f46e5' : '#64748b', fontWeight:700,
                }}>{t.count}</span>
              </button>
            ))}
          </div>

          {activeTab==='urls' && (
            <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
              <div className="fp-search-wrap" style={{ width:210 }}>
                <Search size={13} className="fp-search-ico"/>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search…" className="fp-search-inp"/>
              </div>
              <button onClick={() => setFilterFav(v=>!v)} style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'8px 13px', borderRadius:10, cursor:'pointer',
                border:`1px solid ${filterFav?'#fbbf24':'#e2e8f0'}`,
                background:filterFav?'#fffbeb':'#fff',
                color:filterFav?'#d97706':'#64748b',
                fontSize:'0.77rem', fontWeight:filterFav?600:400,
                transition:'all .15s', fontFamily:"'Inter',sans-serif",
                boxShadow: filterFav ? '0 2px 8px rgba(245,158,11,.15)' : '0 1px 2px rgba(0,0,0,.04)',
              }}>
                <Star size={12} fill={filterFav?'#f59e0b':'none'} stroke={filterFav?'#f59e0b':'currentColor'}/>
                Favs
              </button>
              {allTags.map(t => (
                <span key={t} className={`fp-tag click${activeTag===t?' on':''}`}
                  onClick={() => setActiveTag(activeTag===t?null:t)}>{t}</span>
              ))}
              {(search||activeTag||filterFav) && (
                <button onClick={() => { setSearch(''); setActiveTag(null); setFilterFav(false); }} style={{
                  padding:'7px 10px', borderRadius:8, cursor:'pointer',
                  background:'none', border:'1px solid #fecdd3',
                  color:'#f43f5e', fontSize:'0.74rem', fontFamily:"'Inter',sans-serif",
                  display:'flex', alignItems:'center', gap:4, transition:'all .13s',
                }}>
                  <X size={10}/> Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Tab: URLs ── */}
        {activeTab==='urls' && (
          <>
            {folderUrls.length===0 ? (
              <div className="fp-empty">
                <div style={{
                  width:56, height:56, borderRadius:16,
                  background:'#eef2ff', border:'1px solid #c7d2fe',
                  display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px',
                }}>
                  <Globe size={26} color="#6366f1"/>
                </div>
                <p style={{ fontSize:'0.95rem', fontWeight:600, color:'#334155', margin:'0 0 6px' }}>No URLs yet</p>
                <p style={{ fontSize:'0.8rem', color:'#94a3b8', margin:'0 0 22px' }}>Add your first URL to this folder</p>
                {isAdmin && (
                  <button onClick={() => setAddUrlOpen(true)} className="fp-btn fp-btn-dark" style={{ margin:'0 auto' }}>
                    <Plus size={14}/> Add First URL
                  </button>
                )}
              </div>
            ) : sorted.length===0 ? (
              <div style={{ padding:'40px 24px', textAlign:'center', border:'1.5px dashed #cbd5e1', borderRadius:16, background:'#f8fafc' }}>
                <p style={{ fontSize:'0.88rem', color:'#94a3b8', margin:'0 0 14px' }}>No URLs match your filters</p>
                <button onClick={() => { setSearch(''); setActiveTag(null); setFilterFav(false); }}
                  className="fp-btn fp-btn-ghost" style={{ margin:'0 auto', fontSize:'0.79rem' }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {sorted.map((url,i) => (
                  <div key={url._id} style={{ animation:`fp-card .22s cubic-bezier(.22,1,.36,1) ${i*.04}s both` }}>
                    <UrlCard
                      url={url}
                      isFav={favorites.includes(url._id)}
                      isPinned={pinned.includes(url._id)}
                      isAdmin={isAdmin}
                      onSelect={onUrlSelect}
                      onToggleFav={onToggleFav}
                      onTogglePin={onTogglePin}
                      onPing={onPing}
                      onDelete={handleDelete}
                      onRefreshFavicon={handleRefreshFavicon}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Subfolders ── */}
        {activeTab==='subs' && (
          <>
            {subs.length===0 ? (
              <div className="fp-empty">
                <div style={{
                  width:52, height:52, borderRadius:14,
                  background:'linear-gradient(135deg,#fffbeb,#fef3c7)',
                  border:'1px solid #fde68a', display:'flex', alignItems:'center',
                  justifyContent:'center', margin:'0 auto 14px',
                  boxShadow:'0 4px 12px rgba(245,158,11,.15)',
                }}>
                  <Layers size={24} color="#d97706"/>
                </div>
                <p style={{ fontSize:'0.92rem', fontWeight:600, color:'#334155', margin:'0 0 6px' }}>No subfolders</p>
                <p style={{ fontSize:'0.79rem', color:'#94a3b8', margin:'0 0 20px' }}>Organise with nested folders</p>
                {isAdmin && (
                  <button onClick={() => setAddSubOpen(true)} className="fp-btn fp-btn-amber" style={{ margin:'0 auto' }}>
                    <FolderPlus size={13}/> Create Subfolder
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="fp-sec">
                  Subfolders <span className="fp-sec-badge">{subs.length}</span>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {subs.map((s,i) => (
                    <div key={s} style={{ animation:`fp-card .22s ease ${i*.05}s both`, flex:'1 1 200px', maxWidth:280 }}>
                      <SubCard name={s} urlCount={subCount(s)} onClick={() => onFolderOpen(`${folderPath}/${s}`)}/>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default FolderPage;