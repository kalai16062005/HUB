import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import companyLogo from '../assets/hub-company.png';
import { useAuth } from '../context/useAuth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type = 'success', onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  const isSuccess = type === 'success';
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24,
      zIndex: 99999, display: 'flex', alignItems: 'center', gap: 10,
      padding: '13px 20px', borderRadius: 12,
      backgroundColor: isSuccess ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.3)'}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      backdropFilter: 'blur(10px)',
      color: isSuccess ? '#16a34a' : '#ef4444',
      fontSize: '0.9rem', fontWeight: 600,
      animation: 'toast-slide-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(80px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      {isSuccess
        ? <CheckCircle2 size={18} color="#16a34a" />
        : <AlertCircle  size={18} color="#ef4444" />}
      {message}
    </div>
  );
};

// ─── OtpVerify ────────────────────────────────────────────────────────────────
const OtpVerify = () => {
  const [otp, setOtp]         = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState(null); // { message, type }
  const inputRefs             = useRef([]);
  const navigate              = useNavigate();
  const location              = useLocation();
  const { complete2FALogin }  = useAuth();

  const username = location.state?.username || localStorage.getItem('username');

  const handleChange = (i, v) => {
    if (isNaN(v)) return;
    const next = [...otp];
    next[i] = v.slice(-1);
    setOtp(next);
    if (v && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setOtp(p.split('')); inputRefs.current[5]?.focus(); }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) { setError('Enter 6-digit OTP'); return; }
    if (!username) {
      setError('Username missing. Please login again.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res  = await fetch(`${API}/api/auth/login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token: fullOtp }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.removeItem('username');
        
        showToast('Welcome back, ' + data.username + '!', 'success');
        setTimeout(() => {
          complete2FALogin({
            token:              data.token,
            _id:                data._id,
            username:           data.username,
            role:               data.role,
            twoFactorEnabled:   data.twoFactorEnabled,
            mustChangePassword: data.mustChangePassword,
          });
          navigate('/');
        }, 1800);

      } else {
        setError(data.message || 'Invalid OTP. Try again.');
        showToast(data.message || 'Invalid OTP. Try again.', 'error');
        setOtp(['','','','','','']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      const msg = 'Server error. Check if backend is running.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      <div style={{ width:'100vw', height:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'radial-gradient(circle at top right, #f1f5f9, #e2e8f0)' }}>
        <div className="glass" style={{ width:'100%', maxWidth:'420px', padding:'40px', textAlign:'center' }}>

          <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
            <img src={companyLogo} alt="Hub" style={{ height:46, objectFit:'contain' }}/>
          </div>

          <div style={{ width:56, height:56, borderRadius:16,
            backgroundColor:'rgba(37,99,235,0.1)', display:'flex',
            alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <ShieldCheck size={26} color="var(--primary)"/>
          </div>

          <h2 style={{ fontSize:'1.4rem', fontWeight:800, color:'var(--text-main)', marginBottom:8 }}>
            Verify Identity
          </h2>
          <p style={{ color:'var(--text-main)', opacity:0.5, fontSize:'0.85rem', marginBottom:8 }}>
            Enter the 6-digit code from your Authenticator app
          </p>
          <p style={{ color:'var(--primary)', fontSize:'0.82rem', fontWeight:600, marginBottom:28 }}>
            {username}
          </p>

          {error && (
            <div style={{ backgroundColor:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)',
              color:'#ef4444', padding:'10px 14px', borderRadius:8, marginBottom:20,
              fontSize:'0.85rem', display:'flex', alignItems:'center', gap:8 }}>
              <AlertCircle size={15}/> {error}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:28 }}
              onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input key={i} type="text" inputMode="numeric" maxLength="1"
                  ref={el => inputRefs.current[i] = el}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  style={{ width:46, height:56, fontSize:'1.4rem', fontWeight:700,
                    textAlign:'center', borderRadius:10, outline:'none',
                    border:`2px solid ${digit ? 'var(--primary)' : '#e2e8f0'}`,
                    backgroundColor: digit ? 'rgba(37,99,235,0.05)' : 'white',
                    color:'var(--text-main)', transition:'border 0.15s' }}/>
              ))}
            </div>

            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:14, backgroundColor:'var(--primary)',
                color:'white', borderRadius:8, fontWeight:600, fontSize:'1rem',
                cursor:loading ? 'not-allowed' : 'pointer', border:'none',
                opacity:loading ? 0.7 : 1, display:'flex', alignItems:'center',
                justifyContent:'center', gap:8 }}>
              {loading
                ? 'Verifying...'
                : <><ShieldCheck size={16}/> Verify &amp; Sign In</>
              }
            </button>
          </form>

          <p style={{ marginTop:16, fontSize:'0.75rem', color:'var(--text-main)', opacity:0.4 }}>
            Code refreshes every 30 seconds in your app.
          </p>

          <button onClick={() => navigate('/login')}
            style={{ marginTop:12, background:'none', border:'none',
              color:'var(--text-main)', opacity:0.4, cursor:'pointer', fontSize:'0.8rem' }}>
            ← Back to login
          </button>
        </div>
      </div>
    </>
  );
};

export default OtpVerify;