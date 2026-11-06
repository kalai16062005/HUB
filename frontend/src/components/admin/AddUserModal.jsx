import React, { useState } from 'react';
import { X, User, Shield, Copy, CheckCheck, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { TriangleAlert } from "lucide-react";

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('user');
  const [team, setTeam] = useState('General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/admin/users`, { username, role, team: team.trim() || 'General' });
      setResult(res.data);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `Username: ${result.username}\nPassword: ${result.tempPassword}\nWebsite URL: ${API}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setUsername('');
    setRole('user');
    setTeam('General');
    setResult(null);
    setError('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '20px'
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '30px',
        position: 'relative',
        backgroundColor: 'var(--sidebar-bg)'
      }}>
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'transparent', border: 'none',
            color: 'var(--text-main)', opacity: 0.4, cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Success state */}
        {result ? (
          <div>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={24} color="#16a34a" /> User Created!
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', opacity: 0.5, marginBottom: '24px' }}>
              Share these credentials with the user.
            </p>

            <div style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <p style={{ fontSize: '0.75rem', opacity: 0.5, color: 'var(--text-main)', margin: 0 }}>
                    USERNAME
                  </p>
                  <button onClick={() => { navigator.clipboard.writeText(result.username); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--primary)', opacity: 0.7 }} title="Copy username">
                    <Copy size={13} />
                  </button>
                </div>
                <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>
                  {result.username}
                </p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <p style={{ fontSize: '0.75rem', opacity: 0.5, color: 'var(--text-main)', margin: 0 }}>
                    TEMP PASSWORD
                  </p>
                  <button onClick={() => { navigator.clipboard.writeText(result.tempPassword); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--primary)', opacity: 0.7 }} title="Copy password">
                    <Copy size={13} />
                  </button>
                </div>
                <p style={{
                  fontSize: '1rem', fontWeight: '700',
                  color: 'var(--primary)', fontFamily: 'monospace', letterSpacing: '1px', margin: 0
                }}>
                  {result.tempPassword}
                </p>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <p style={{ fontSize: '0.75rem', opacity: 0.5, color: 'var(--text-main)', margin: 0 }}>
                    WEBSITE URL
                  </p>
                  <button onClick={() => { navigator.clipboard.writeText(API); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--primary)', opacity: 0.7 }} title="Copy website URL">
                    <Copy size={13} />
                  </button>
                </div>
                <p style={{
                  fontSize: '0.9rem', fontWeight: '600',
                  color: 'var(--text-main)', fontFamily: 'monospace', margin: 0
                }}>
                  {API}
                </p>
              </div>
            </div>

          <div style={{ 
  display: 'flex', 
  alignItems: 'center', 
  gap: '6px', 
  marginBottom: '20px' 
}}>
  <TriangleAlert size={26} color="#f50b0b" />
  
  <p style={{ 
    fontSize: '0.78rem', 
    color: '#f50b0b', 
    margin: 0 
  }}>
    This password will only be shown once. Please copy and share it with the user.
  </p>
</div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1, padding: '12px',
                  backgroundColor: 'var(--primary)',
                  color: 'white', border: 'none',
                  borderRadius: '8px', fontWeight: '600',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '8px', fontSize: '0.9rem'
                }}
              >
                {copied
                  ? <><CheckCheck size={16} /> All Copied!</>
                  : <><Copy size={16} /> Copy All</>
                }
              </button>
              <button
                onClick={handleClose}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form state */
          <>
            <h2 style={{
              fontSize: '1.3rem', marginBottom: '8px',
              display: 'flex', alignItems: 'center',
              gap: '10px', color: 'var(--text-main)'
            }}>
              <User size={22} color="var(--primary)" /> Add New User
            </h2>
            <p style={{ color: 'var(--text-main)', opacity: 0.5, fontSize: '0.88rem', marginBottom: '24px' }}>
              A temporary password will be auto-generated.
            </p>

            {error && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', color: '#ef4444',
                fontSize: '0.85rem', marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.85rem', fontWeight: '500',
                  color: 'var(--text-main)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <User size={14} /> Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. john_doe"
                  required
                  className="glass"
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px', outline: 'none',
                    fontSize: '0.95rem', width: '100%'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.85rem', fontWeight: '500',
                  color: 'var(--text-main)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <Shield size={14} /> Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="glass"
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px', outline: 'none',
                    fontSize: '0.95rem', width: '100%', cursor: 'pointer'
                  }}
                >
                  <option value="user">Viewer (User)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.85rem', fontWeight: '500',
                  color: 'var(--text-main)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  👥 Team
                </label>
                <input
                  type="text"
                  value={team}
                  onChange={e => setTeam(e.target.value)}
                  placeholder="e.g. Engineering, Sales, Design"
                  className="glass"
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px', outline: 'none',
                    fontSize: '0.95rem', width: '100%'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '6px', padding: '14px',
                  backgroundColor: loading ? 'rgba(37,99,235,0.5)' : 'var(--primary)',
                  color: 'white', border: 'none',
                  borderRadius: '8px', fontWeight: '600',
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AddUserModal;