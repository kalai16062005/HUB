import React, { useState } from 'react';
import { X, Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

const BulkUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const firstLine = lines[0].toLowerCase();

      if (!firstLine.includes('username')) {
        setError('CSV must have a header row with "username" column');
        setLoading(false);
        return;
      }

      const users = lines
        .slice(1)
        .filter(r => r.trim())
        .map(row => {
          const [username, role] = row.split(',');
          return {
            username: username?.trim(),
            role: role?.trim() || 'user'
          };
        })
        .filter(u => u.username);

      if (users.length === 0) {
        setError('No valid users found in CSV');
        setLoading(false);
        return;
      }

      const res = await axios.post(`${API}/api/admin/users/bulk`, { users });
      setResults(res.data.results);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadCredentials = () => {
    const csv = [
      'username,tempPassword,status',
      ...results.map(r =>
        `${r.username},${r.tempPassword || ''},${r.status}${r.reason ? ' - ' + r.reason : ''}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-credentials.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setResults(null);
    setError('');
    onClose();
  };

  const createdCount = results?.filter(r => r.status === 'created').length || 0;
  const failedCount  = results?.filter(r => r.status === 'failed').length  || 0;

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
        maxWidth: '520px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
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

        <h2 style={{
          fontSize: '1.3rem', marginBottom: '8px',
          display: 'flex', alignItems: 'center',
          gap: '10px', color: 'var(--text-main)'
        }}>
          <Upload size={22} color="var(--primary)" /> Bulk Upload Users
        </h2>

        {/* Upload state */}
        {!results ? (
          <>
            <p style={{ color: 'var(--text-main)', opacity: 0.5, fontSize: '0.88rem', marginBottom: '24px' }}>
              Upload a CSV file to create multiple users at once.
            </p>

            {/* Format guide */}
            <div style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '14px', marginBottom: '20px'
            }}>
              <p style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-main)', opacity: 0.6, marginBottom: '8px' }}>
                CSV FORMAT
              </p>
              <code style={{ fontSize: '0.82rem', color: 'var(--primary)', fontFamily: 'monospace', display: 'block' }}>
                username,role
              </code>
              <code style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontFamily: 'monospace', opacity: 0.7, display: 'block' }}>
                john_doe,user
              </code>
              <code style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontFamily: 'monospace', opacity: 0.7, display: 'block' }}>
                jane_smith,user
              </code>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', opacity: 0.4, marginTop: '8px' }}>
                role column optional — defaults to "user"
              </p>
            </div>

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

            <label style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '12px', padding: '32px',
              border: '2px dashed var(--border-color)',
              borderRadius: '10px', cursor: 'pointer',
              backgroundColor: 'var(--card-bg)'
            }}>
              <Upload size={28} color="var(--primary)" opacity={0.7} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', opacity: 0.6 }}>
                {loading ? 'Processing...' : 'Click to select CSV file'}
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFile}
                disabled={loading}
                style={{ display: 'none' }}
              />
            </label>
          </>
        ) : (
          /* Results state */
          <>
            {/* Summary */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '20px',
                backgroundColor: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e', fontSize: '0.85rem', fontWeight: '600'
              }}>
                <CheckCircle size={14} /> {createdCount} created
              </div>
              {failedCount > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '20px',
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444', fontSize: '0.85rem', fontWeight: '600'
                }}>
                  <XCircle size={14} /> {failedCount} failed
                </div>
              )}
            </div>

            {/* Results list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {results.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: '8px',
                    backgroundColor: 'var(--card-bg)',
                    border: `1px solid ${r.status === 'created' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                  }}
                >
                  <div>
                    <p style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {r.username}
                    </p>
                    {r.status === 'created' ? (
                      <p style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--primary)', marginTop: '2px' }}>
                        {r.tempPassword}
                      </p>
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '2px' }}>
                        {r.reason}
                      </p>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: '600',
                    color: r.status === 'created' ? '#22c55e' : '#ef4444'
                  }}>
                    {r.status === 'created' ? '✓' : '✗'}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {createdCount > 0 && (
                <button
                  onClick={downloadCredentials}
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
                  <Download size={16} /> Download Credentials
                </button>
              )}
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
          </>
        )}
      </div>
    </div>
  );
};

export default BulkUploadModal;