import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import axios from 'axios';
import companyLogo from '../assets/hub-company.png';

const API = import.meta.env.VITE_API_URL;

const ChangePassword = () => {
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/change-password`, { newPassword });
      updateUser({ ...user, mustChangePassword: false }); // context update
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #f1f5f9, #e2e8f0)'
    }}>
      <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <img src={companyLogo} alt="Hub" style={{ height: '50px', objectFit: 'contain' }} />
        </div>

        {/* Title */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          backgroundColor: 'rgba(37,99,235,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Lock size={24} color="var(--primary)" />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
          Set New Password
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', opacity: 0.5, marginBottom: '8px' }}>
          Welcome, <strong>{user?.username}</strong>!
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', opacity: 0.5, marginBottom: '28px' }}>
          Your account was created by an admin. Please set a new password to continue.
        </p>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444', padding: '12px', borderRadius: '8px',
            marginBottom: '20px', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>

          {/* New Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={14} /> New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                className="glass"
                style={{
                  width: '100%', padding: '12px', paddingRight: '45px',
                  backgroundColor: 'var(--card-bg)', color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px', outline: 'none', fontSize: '0.95rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'var(--text-dim)', cursor: 'pointer', opacity: 0.6
                }}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={14} /> Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="glass"
                style={{
                  width: '100%', padding: '12px', paddingRight: '45px',
                  backgroundColor: 'var(--card-bg)', color: 'var(--text-main)',
                  border: `1px solid ${confirmPassword && confirmPassword !== newPassword ? 'rgba(239,68,68,0.5)' : 'var(--border-color)'}`,
                  borderRadius: '8px', outline: 'none', fontSize: '0.95rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'var(--text-dim)', cursor: 'pointer', opacity: 0.6
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* Match indicator */}
            {confirmPassword && (
              <p style={{
                fontSize: '0.75rem', marginTop: '2px',
                color: confirmPassword === newPassword ? '#22c55e' : '#ef4444',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                {confirmPassword === newPassword
                  ? <><CheckCircle size={12} /> Passwords match</>
                  : <><AlertCircle size={12} /> Passwords do not match</>
                }
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '6px', padding: '14px',
              backgroundColor: loading ? 'rgba(37,99,235,0.5)' : 'var(--primary)',
              color: 'white', border: 'none', borderRadius: '8px',
              fontWeight: '600', fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;