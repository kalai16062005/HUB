import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, QrCode, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/useAuth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState('idle');
  const [qrCode, setQrCode] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [loggingOutOthers, setLoggingOutOthers] = useState(false);
  const [status, setStatus] = useState(user?.twoFactorEnabled ? 'enabled' : 'disabled');

  useEffect(() => {
    setStatus(user?.twoFactorEnabled ? 'enabled' : 'disabled');
    if (user?.twoFactorEnabled) {
      setStep('done');
    }
  }, [user?.twoFactorEnabled]);

  const startTfaSetup = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    setOtp('');
    setQrCode('');

    try {
      const { data } = await axios.post(`${API}/api/auth/setup`);
      if (data.success && data.qrCode) {
        setQrCode(data.qrCode);
        setStep('qr');
        setMessage('Scan the QR code with your authenticator app, then enter the code below.');
      } else {
        setError(data.message || 'Failed to generate 2FA QR code.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to start TFA setup.');
    } finally {
      setLoading(false);
    }
  };

  const verifyTfa = async () => {
    if (otp.trim().length !== 6) {
      setError('Enter a 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data } = await axios.post(`${API}/api/auth/verify`, { token: otp.trim() });
      if (data.success) {
        setStatus('enabled');
        setStep('done');
        setMessage('Two-factor authentication is now enabled for your account.');
        setQrCode('');
        setOtp('');
        if (typeof updateUser === 'function') {
          updateUser({ ...user, twoFactorEnabled: true });
        }
      } else {
        setError(data.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logoutOtherSessions = async () => {
    setLoggingOutOthers(true);
    setSessionError('');
    setSessionMessage('');
    try {
      const { data } = await axios.delete(`${API}/api/auth/sessions/logout-others`);
      setSessionMessage(data.message || 'Other sessions have been logged out.');
    } catch (err) {
      setSessionError(err.response?.data?.message || 'Unable to logout other sessions.');
    } finally {
      setLoggingOutOthers(false);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', padding: 24, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 30, borderRadius: 20, backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(56, 189, 248, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={24} color='#0ea5e9' />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>Account Settings</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--text-dim)' }}>Manage your security and TFA/MFA configuration from one place.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <section style={{ padding: 24, borderRadius: 18, backgroundColor: 'white', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>TFA / MFA</h2>
                <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: '0.95rem' }}>
                  Configure time-based one-time password authentication for your account.
                </p>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 999, backgroundColor: status === 'enabled' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: status === 'enabled' ? '#166534' : '#92400e', fontWeight: 700 }}>
                {status === 'enabled' ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 16px', borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#b91c1c' }}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 16px', borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', color: '#166534' }}>
                <CheckCircle size={18} />
                <span>{message}</span>
              </div>
            )}

            {sessionError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 16px', borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#b91c1c' }}>
                <AlertTriangle size={18} />
                <span>{sessionError}</span>
              </div>
            )}

            {sessionMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 16px', borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', color: '#166534' }}>
                <CheckCircle size={18} />
                <span>{sessionMessage}</span>
              </div>
            )}

            {status === 'enabled' && step === 'done' ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <p style={{ margin: 0, color: 'var(--text-main)', opacity: 0.8 }}>Your account already has two-factor authentication enabled. You can continue using your authenticator app at login.</p>
                <button
                  type='button'
                  onClick={startTfaSetup}
                  disabled={loading}
                  style={{ width: 'fit-content', padding: '12px 18px', borderRadius: 10, border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Preparing...' : 'Reconfigure TFA'}
                </button>
                <button
                  type='button'
                  onClick={logoutOtherSessions}
                  disabled={loggingOutOthers}
                  style={{ width: 'fit-content', padding: '12px 18px', borderRadius: 10, border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 700, cursor: loggingOutOthers ? 'not-allowed' : 'pointer' }}
                >
                  {loggingOutOthers ? 'Logging out other sessions...' : 'Logout other sessions'}
                </button>
              </div>
            ) : step === 'qr' ? (
              <div style={{ display: 'grid', gap: 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                  <div style={{ padding: 18, borderRadius: 20, backgroundColor: 'var(--card-bg)', boxShadow: '0 10px 30px rgba(15,23,42,0.05)' }}>
                    <img src={qrCode} alt='TFA QR code' style={{ width: 220, height: 220, objectFit: 'contain' }} />
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-dim)', textAlign: 'center', maxWidth: 520 }}>Scan this QR code in Google Authenticator, Microsoft Authenticator, or any other TOTP app.</p>
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Verification code</label>
                  <input
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder='Enter 6-digit code'
                    inputMode='numeric'
                    maxLength={6}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem' }}
                  />
                  <button
                    type='button'
                    onClick={verifyTfa}
                    disabled={loading}
                    style={{ padding: '14px 18px', borderRadius: 12, border: 'none', backgroundColor: 'var(--primary)', color: 'white', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                <p style={{ margin: 0, color: 'var(--text-main)', opacity: 0.85 }}>Set up TFA/MFA to protect your account with a time-based code in addition to your password.</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type='button'
                    onClick={startTfaSetup}
                    disabled={loading}
                    style={{ padding: '14px 18px', borderRadius: 12, border: 'none', backgroundColor: 'var(--primary)', color: 'white', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
                  >
                    {loading ? 'Getting QR...' : 'Configure TFA / MFA'}
                  </button>
                  <div style={{ alignSelf: 'center', color: 'var(--text-dim)' }}>
                    <QrCode size={18} /> Scan QR then verify a code.
                  </div>
                </div>
              </div>
            )}
          </section>

          <section style={{ padding: 24, borderRadius: 18, backgroundColor: 'rgba(15,23,42,0.02)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>What is TFA / MFA?</h3>
            <p style={{ margin: '12px 0 0', color: 'var(--text-dim)', lineHeight: 1.7 }}>Two-factor authentication adds a second layer of security by requiring a code from your mobile authenticator app in addition to your password. This helps protect your account if your password is ever compromised.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
