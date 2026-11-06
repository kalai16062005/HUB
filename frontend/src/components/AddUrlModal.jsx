import React, { useState } from 'react';
import { X, Link2, Type, PlusCircle, Shield } from 'lucide-react';

const AddUrlModal = ({ isOpen, onClose, onAdd, users = [] }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [assignedTo, setAssignedTo] = useState([]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && url) {
      // Basic URL validation/fixing
      let fixedUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        fixedUrl = 'https://' + url;
      }
      onAdd({ name, url: fixedUrl, assignedTo: assignedTo });
      setName('');
      setUrl('');
      setAssignedTo([]);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass" style={{ width: '100%', maxWidth: '450px', padding: '30px', position: 'relative', backgroundColor: 'var(--sidebar-bg)' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: 'transparent', color: 'var(--text-main)', opacity: 0.4 }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.4rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-main)' }}>
          <PlusCircle size={24} color="var(--primary)" />
          Add New Site
        </h2>
        <p style={{ color: 'var(--text-main)', opacity: 0.5, fontSize: '0.9rem', marginBottom: '25px' }}>
          Enter the details of the website you want to add to your hub.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Type size={14} /> Site Name
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Google, GitHub"
              required
              className="glass"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Link2 size={14} /> Website URL
            </label>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. google.com"
              required
              className="glass"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Shield size={14} /> Assign to Users (Optional)
            </label>
            <div style={{ 
              maxHeight: '120px', 
              overflowY: 'auto', 
              padding: '10px', 
              backgroundColor: 'var(--card-bg)', 
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {users.filter(u => u.role !== 'admin').map(u => (
                <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  <input 
                    type="checkbox" 
                    checked={assignedTo.includes(u._id)}
                    onChange={(e) => {
                      if (e.target.checked) setAssignedTo([...assignedTo, u._id]);
                      else setAssignedTo(assignedTo.filter(id => id !== u._id));
                    }}
                  />
                  {u.username}
                </label>
              ))}
              {users.filter(u => u.role !== 'admin').length === 0 && (
                <p style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center' }}>No viewer accounts found.</p>
              )}
            </div>
          </div>

          <button 
            type="submit"
            style={{
              marginTop: '10px',
              padding: '14px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            Add to Hub
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddUrlModal;
