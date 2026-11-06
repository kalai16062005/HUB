import React, { useState, useEffect } from 'react';
import { Shield, Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import SessionHistory from '../components/admin/SessionHistory';
import Sidebar from '../components/Sidebar';
import axios from 'axios';

const Security = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(user);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    setUserData(user);
  }, [user]);

  const showToast = (message, type = 'success', duration = 2500) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), duration);
  };

  const refreshUserData = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setUserData(data);
      showToast('Data refreshed', 'success');
    } catch (err) {
      console.error('Error:', err);
      showToast('Failed to refresh data', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      
      {/* Toast */}
      {toast.message && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 20px', borderRadius: '12px', minWidth: '280px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {toast.type === 'success' ? (
            <Check size={20} color="#16a34a" />
          ) : (
            <AlertCircle size={20} color="#dc2626" />
          )}
          <span style={{
            fontSize: '0.9rem', fontWeight: '500',
            color: toast.type === 'success' ? '#15803d' : '#dc2626', flex: 1
          }}>
            {toast.message}
          </span>
        </div>
      )}

      <div style={{ flex: 1, padding: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ background: '#dbeafe', padding: '8px', borderRadius: '8px' }}>
              <Shield size={24} color="#2563eb" />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0, color: '#0f172a' }}>
              Security Settings
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
            Manage your account security and authentication methods
          </p>
        </div>

        {/* 2FA Status Card */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '28px',
          marginBottom: '40px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 4px 0', color: '#0f172a' }}>
                Two-Factor Authentication (2FA)
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                Add an extra layer of security to your account
              </p>
            </div>
            {userData?.twoFactorEnabled ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: '#d1fae5', padding: '8px 16px', borderRadius: '8px'
              }}>
                <Check size={18} color="#059669" />
                <span style={{ color: '#047857', fontWeight: '600', fontSize: '0.9rem' }}>
                  Enabled
                </span>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: '#fee2e2', padding: '8px 16px', borderRadius: '8px'
              }}>
                <X size={18} color="#dc2626" />
                <span style={{ color: '#b91c1c', fontWeight: '600', fontSize: '0.9rem' }}>
                  Disabled
                </span>
              </div>
            )}
          </div>

          <div style={{
            backgroundColor: '#f1f5f9',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.9rem',
            color: '#475569',
            lineHeight: '1.6'
          }}>
            {userData?.twoFactorEnabled ? (
              <>
                ✅ Your account is protected with Two-Factor Authentication. When you login, you'll need to enter a code from your authenticator app.
              </>
            ) : (
              <>
                ⚠️ Your account doesn't have Two-Factor Authentication enabled. We recommend enabling it to protect your account.
              </>
            )}
          </div>
        </div>

        {/* Account Info Card */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '28px',
          marginBottom: '40px'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 20px 0', color: '#0f172a' }}>
            Account Information
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Username
              </label>
              <p style={{ fontSize: '1rem', fontWeight: '500', color: '#0f172a', margin: '8px 0 0 0' }}>
                {userData?.username || '—'}
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Role
              </label>
              <p style={{ fontSize: '1rem', fontWeight: '500', color: '#0f172a', margin: '8px 0 0 0' }}>
                {userData?.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : '—'}
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Password Change Required
              </label>
              <p style={{ fontSize: '1rem', fontWeight: '500', color: userData?.mustChangePassword ? '#dc2626' : '#059669', margin: '8px 0 0 0' }}>
                {userData?.mustChangePassword ? 'Yes' : 'No'}
              </p>
            </div>
          </div>

          <button
            onClick={refreshUserData}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '8px',
              backgroundColor: '#2563eb', color: 'white',
              border: 'none', fontWeight: '600', fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Session History */}
        <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#0f172a', marginBottom: '20px' }}>
          Active Sessions
        </h2>
        <SessionHistory />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Security;