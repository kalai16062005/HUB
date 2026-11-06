import React, { useState } from 'react';
import { ShieldCheck, QrCode, X, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/useAuth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── OTP 6-box input ───────────────────────────────────────────────────────────
const OtpInput = ({ value, onChange }) => {
  const refs   = React.useRef([]);
  const digits = (value || '').padEnd(6, '').split('').slice(0, 6);

  const handleChange = (i, v) => {
    if (isNaN(v)) return;
    const arr = [...digits]; arr[i] = v.slice(-1);
    onChange(arr.join(''));
    if (v && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { onChange(p); refs.current[5]?.focus(); }
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i} type="text" inputMode="numeric" maxLength="1"
          ref={el => refs.current[i] = el}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          style={{
            width: 42, height: 50, fontSize: '1.2rem', fontWeight: 700,
            textAlign: 'center', borderRadius: 10, outline: 'none',
            border: `2px solid ${digits[i] ? 'var(--primary)' : 'var(--border-color)'}`,
            backgroundColor: digits[i] ? 'rgba(37,99,235,0.05)' : 'var(--card-bg)',
            color: 'var(--text-main)', transition: 'border 0.15s',
          }}
        />
      ))}
    </div>
  );
};

// ── Main Banner ───────────────────────────────────────────────────────────────
const TwoFASetupBanner = () => {
  // ✅ FIX: safe destructure — updateUser may not exist in all useAuth versions
  const auth = useAuth();
  const user        = auth?.user;
  const updateUser  = auth?.updateUser;   // may be undefined — handled below
  const refreshUser = auth?.refreshUser;  // alternative name some contexts use

  const [step, setStep]           = useState('banner');
  const [qr, setQr]               = useState('');
  const [otp, setOtp]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [dismissed, setDismissed] = useState(false);

  // ── Guard: hide if 2FA already on, dismissed, or user not loaded ──────────
  // twoFactorEnabled could be true, false, or undefined (field missing from token)
  // Only hide if EXPLICITLY true
  if (!user) return null;
  if (user.twoFactorEnabled === true || dismissed) return null;

  const cfg = () => ({
    headers: { Authorization: `Bearer ${user?.token}` },
  });

  // ── Mark 2FA enabled in local user state ──────────────────────────────────
  // Works with updateUser, setUser, or refreshUser — whichever exists
  const markEnabled = () => {
    if (typeof updateUser === 'function') {
      updateUser({ ...user, twoFactorEnabled: true });
    } else if (typeof refreshUser === 'function') {
      refreshUser();
    } else {
      // Last resort: force a page reload so AuthContext re-reads from storage
      // This is safe because 2FA is already saved in DB at this point
      console.warn('[2FA] No updateUser/refreshUser found in useAuth — reloading to sync state');
      window.location.reload();
    }
  };

  // ── Step 1: get QR ────────────────────────────────────────────────────────
  const handleStartSetup = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API}/api/auth/setup`, {}, cfg());
      if (data.success && data.qrCode) {
        setQr(data.qrCode);
        setStep('qr');
      } else {
        setError('Failed to generate QR. Try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Network error.';
      console.error('[2FA setup] /setup failed:', msg, err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError('Enter 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API}/api/auth/verify`, { token: otp }, cfg());
      if (data.success) {
        markEnabled();   // ← safe regardless of which fn exists
        setStep('done');
      } else {
        setError(data.message || 'Invalid OTP. Try again.');
        setOtp('');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Network error.';
      console.error('[2FA setup] /verify failed:', msg, err);
      setError(msg);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div style={{
      margin: '16px 20px 0', padding: '14px 20px', borderRadius: 12,
      backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <CheckCircle size={20} color="#16a34a" />
      <div>
        <p style={{ fontWeight: 700, color: '#166534', fontSize: '0.92rem', margin: 0 }}>
          2FA Enabled!
        </p>
        <p style={{ fontSize: '0.78rem', color: '#166534', opacity: 0.8, margin: 0 }}>
          Next login you'll be asked for an OTP. Your account is now secure.
        </p>
      </div>
    </div>
  );

  // ── Banner ────────────────────────────────────────────────────────────────
  if (step === 'banner') return (
    <div style={{
      margin: '16px 20px 0', padding: '12px 18px', borderRadius: 12,
      backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldCheck size={20} color="#92400e" />
        <div>
          <p style={{ fontWeight: 700, color: '#92400e', fontSize: '0.88rem', margin: 0 }}>
            2FA not enabled
          </p>
          <p style={{ fontSize: '0.75rem', color: '#92400e', opacity: 0.8, margin: 0 }}>
            Secure your account with Two-Factor Authentication
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleStartSetup} disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', backgroundColor: '#92400e', color: 'white',
            border: 'none', borderRadius: 8, fontWeight: 600,
            fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}>
          <QrCode size={14} /> {loading ? 'Loading...' : 'Set Up 2FA'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none', color: '#92400e',
            cursor: 'pointer', opacity: 0.5, padding: 4,
          }}
          title="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );

  // ── QR step ───────────────────────────────────────────────────────────────
  if (step === 'qr') return (
    <div style={{
      margin: '16px 20px 0', padding: 20, borderRadius: 12,
      backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <ShieldCheck size={18} color="var(--primary)" />
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
          Scan QR Code
        </span>
        <span style={{
          fontSize: '0.72rem', backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: 20,
          color: 'var(--text-main)', opacity: 0.5,
        }}>
          Step 1 of 2
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{
          padding: 14, backgroundColor: 'white', borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexShrink: 0,
        }}>
          {qr
            ? <img src={qr} alt="QR" style={{ width: 140, height: 140, display: 'block', borderRadius: 6 }} />
            : <div style={{ width: 140, height: 140, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>Loading...</div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-main)', marginBottom: 10, lineHeight: 1.6 }}>
            <strong>1.</strong> Open <strong>Google</strong> or <strong>Microsoft Authenticator</strong><br />
            <strong>2.</strong> Tap "+" → Scan QR code<br />
            <strong>3.</strong> Click continue below
          </p>
          <div style={{
            padding: '8px 12px', backgroundColor: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8,
            fontSize: '0.72rem', color: '#92400e',
          }}>
            ⚠️ Save this QR — you cannot view it again after continuing
          </div>
        </div>
      </div>

      <button
        onClick={() => { setStep('otp'); setError(''); }}
        style={{
          marginTop: 14, padding: '9px 18px', backgroundColor: 'var(--primary)',
          color: 'white', border: 'none', borderRadius: 8, fontWeight: 600,
          fontSize: '0.88rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
        I've scanned it → Enter OTP
      </button>
    </div>
  );

  // ── OTP step ──────────────────────────────────────────────────────────────
  if (step === 'otp') return (
    <div style={{
      margin: '16px 20px 0', padding: 20, borderRadius: 12,
      backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <ShieldCheck size={18} color="var(--primary)" />
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
          Verify OTP
        </span>
        <span style={{
          fontSize: '0.72rem', backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: 20,
          color: 'var(--text-main)', opacity: 0.5,
        }}>
          Step 2 of 2
        </span>
      </div>

      <p style={{ fontSize: '0.83rem', color: 'var(--text-main)', opacity: 0.6, marginBottom: 16 }}>
        Enter the 6-digit code from your Authenticator app to confirm setup.
      </p>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
          backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8, color: '#ef4444', fontSize: '0.83rem', marginBottom: 14,
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <OtpInput value={otp} onChange={setOtp} />

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          onClick={() => { setStep('qr'); setOtp(''); setError(''); }}
          style={{
            padding: '9px 14px', backgroundColor: 'transparent',
            border: '1px solid var(--border-color)', borderRadius: 8,
            color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem',
          }}>
          ← Back
        </button>
        <button
          onClick={handleVerifyOtp}
          disabled={loading || otp.length !== 6}
          style={{
            flex: 1, padding: '9px 18px', backgroundColor: 'var(--primary)',
            color: 'white', border: 'none', borderRadius: 8, fontWeight: 600,
            fontSize: '0.88rem',
            cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
            opacity: otp.length !== 6 ? 0.5 : 1,
          }}>
          {loading ? 'Verifying...' : 'Enable 2FA ✓'}
        </button>
      </div>
    </div>
  );
};

export default TwoFASetupBanner;