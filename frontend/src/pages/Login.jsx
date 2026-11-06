import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Lock, User, LogIn, AlertCircle, Eye, EyeOff, Globe, Linkedin, Youtube, ExternalLink } from 'lucide-react';
import companyLogo from '../assets/hub-company.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();

  if (user) {
    if (user.mustChangePassword && user.role !== 'admin') {
      return <Navigate to="/change-password" />;
    }
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = await login(username, password);

  
    if (!result.success) {
      setError(result.message || 'Login failed');
      return;
    }

    
    if (result.needsQRSetup) {
      navigate('/qr-setup', { state: { userId: result.userId, username } });
      return;
    }

    if (result.requires2FA) {
      localStorage.setItem('username', username);
      navigate('/otp-verify', { state: { username } });
      return;
    }

    
    if (result.mustChangePassword && result.userRole !== 'admin') {
      navigate('/change-password');
      return;
    }

    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div style={{ 
      width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #f1f5f9, #e2e8f0)'
    }}>
      <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '25px' }}>
          <img src={companyLogo} alt="Hub" style={{ height: '50px', objectFit: 'contain' }} />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)', letterSpacing: '-1px' }}>
          Hub
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '30px' }}>
          Private Enterprise Hub Portal
        </p>

        <div style={{ 
          fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-dim)', 
          opacity: 0.5, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px'
        }}>
          — Internal Purposes Only —
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px',
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={14} /> Username
            </label>
            <input 
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="username" required className="glass"
              style={{
                width: '100%', padding: '12px',
                backgroundColor: 'var(--card-bg)', color: 'var(--text-main)',
                border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={14} /> Password
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required className="glass"
                style={{
                  width: '100%', padding: '12px', paddingRight: '45px',
                  backgroundColor: 'var(--card-bg)', color: 'var(--text-main)',
                  border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none'
                }}
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', opacity: 0.6
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            style={{
              marginTop: '10px', padding: '14px', backgroundColor: 'var(--primary)',
              color: 'white', borderRadius: '8px', fontWeight: '600', fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <LogIn size={18} />}
          </button>
        </form>
      </div>

      <footer style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a href="" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', opacity: 0.7 }} title="Official Website">
            <Globe size={20} />
          </a>
          <a href="" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', opacity: 0.7 }} title="LinkedIn Profile">
            <Linkedin size={20} />
          </a>
          <a href="" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', opacity: 0.7 }} title="YouTube Channel">
            <Youtube size={20} />
          </a>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: '500', marginBottom: '4px' }}>
            © {new Date().getFullYear()} Hub . All rights reserved.
          </p>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '8px', 
            fontSize: '0.65rem', fontWeight: '700', color: 'var(--primary)', 
            textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6
          }}>
            <ExternalLink size={10} /> Hub Internal Workspace
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;