import React, { useCallback, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/useAuth';
import logo from '../assets/hub-hub.png';
import { Wifi, WifiOff } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const MainViewer = ({ activeUrl }) => {
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { user, trackingConsent } = useAuth();

  // Track refs
  const activityIdRef  = useRef(null); // current session ID
  const startTimeRef   = useRef(null); // when URL opened
  const activeUrlRef   = useRef(null); // previous URL reference

  // URL open — activity start
  const startTracking = useCallback(async (url) => {
    if (!url || !user || trackingConsent !== true) return;
    try {
      startTimeRef.current = Date.now();
      const res = await axios.post(`${API}/api/admin/activity/start`, {
        urlId:   url._id,
        urlName: url.name,
        urlPath: url.url
      });
      activityIdRef.current = res.data.activityId;
    } catch (err) {
      console.error('Activity start failed:', err);
    }
  }, [user, trackingConsent]);

  // URL close / switch — activity end
  const endTracking = useCallback(async () => {
    if (!activityIdRef.current || !startTimeRef.current) return;
    try {
      const duration = (Date.now() - startTimeRef.current) / 1000;
      await axios.put(`${API}/api/admin/activity/end/${activityIdRef.current}`, {
        duration
      });
    } catch (err) {
      console.error('Activity end failed:', err);
    } finally {
      activityIdRef.current = null;
      startTimeRef.current  = null;
    }
  }, []);

  useEffect(() => {
    if (activeUrl) {
      setLoading(true);
      setHasError(false);

      if (activeUrlRef.current?._id !== activeUrl._id) {
        endTracking();
      }

      activeUrlRef.current = activeUrl;
      startTracking(activeUrl);

      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeUrl, endTracking, startTracking]);

  useEffect(() => {
    if (trackingConsent === false) endTracking();
  }, [trackingConsent, endTracking]);

  // Tab close / page leave — end tracking
  useEffect(() => {
    const handleUnload = () => endTracking();
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      endTracking(); 
    };
  }, [endTracking]);

  if (!activeUrl) {
    return (
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px', backgroundColor: 'var(--viewer-bg)' }}>
        <div className="glass" style={{ padding: '50px', textAlign: 'center', maxWidth: '450px', backgroundColor: 'var(--card-bg)' }}>
          <img src={logo} alt="Hub" style={{ width: '120px', height: '120px', marginBottom: '25px', opacity: 0.9, objectFit: 'contain' }} />
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '10px', color: 'var(--text-main)', letterSpacing: '-1.2px' }}>Hub</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>
            Enterprise site container for internal private hub.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--viewer-bg)' }}>
      <header className="glass" style={{ margin: '20px', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px', backgroundColor: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Favicon */}
          {activeUrl.favicon && (
            <img src={activeUrl.favicon} alt={activeUrl.name}
              style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 3 }}
              onError={e => { e.target.style.display = 'none'; }}/>
          )}
          <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-main)' }}>
            {activeUrl.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', opacity: 0.6, backgroundColor: 'var(--card-bg)', padding: '4px 10px', borderRadius: '4px' }}>
            {activeUrl.url}
          </div>
          {/* Health badge */}
          {activeUrl.healthStatus === 'online' && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px',
              borderRadius:20, fontSize:'0.72rem', fontWeight:600,
              backgroundColor:'rgba(34,197,94,0.12)', color:'#16a34a' }}>
              <Wifi size={12}/> Online
            </span>
          )}
          {activeUrl.healthStatus === 'offline' && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px',
              borderRadius:20, fontSize:'0.72rem', fontWeight:600,
              backgroundColor:'rgba(239,68,68,0.12)', color:'#dc2626' }}>
              <WifiOff size={12}/> Offline
            </span>
          )}
        </div>
      </header>

      <div style={{ flex: 1, position: 'relative', margin: '0 20px 20px 20px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--viewer-bg)' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div className="animate-pulse" style={{ color: 'var(--primary)', fontWeight: '500' }}>Loading Content...</div>
          </div>
        )}
        <iframe
          src={activeUrl.url}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title={activeUrl.name}
          onLoad={() => setLoading(false)}
          onError={() => setHasError(true)}
        />
        {hasError && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.92)', color: 'var(--text-main)',
            padding: '20px', textAlign: 'center', zIndex: 11,
          }}>
            <div>
              <strong>Unable to load this page.</strong>
              <div style={{ marginTop: '8px', color: 'var(--text-dim)' }}>
                Please verify the URL or try again later.
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default MainViewer;