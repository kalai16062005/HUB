import React, { useState } from 'react';
import { BarChart2, X, Check, Ban } from 'lucide-react';
import { useAuth } from '../context/useAuth';

const TrackingConsentBanner = () => {
  const { trackingConsent, setConsent, user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!user || trackingConsent !== null || dismissed) return null;

  return (
    <>
      <style>{`
        @keyframes consent-in {
          from { opacity:0; transform:translateX(-50%) translateY(16px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      `}</style>
      <div style={{
        position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
        zIndex:99998, width:'100%', maxWidth:520, padding:'0 16px',
        animation:'consent-in 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{
          backgroundColor:'var(--sidebar-bg)', border:'1px solid var(--border-color)',
          borderRadius:16, padding:'20px 22px',
          boxShadow:'0 16px 48px rgba(0,0,0,0.25)', position:'relative',
        }}>
          <button onClick={() => setDismissed(true)}
            style={{ position:'absolute', top:14, right:14, background:'none', border:'none',
              cursor:'pointer', color:'var(--text-main)', opacity:0.35, padding:4 }}
            onMouseEnter={e=>e.currentTarget.style.opacity='0.8'}
            onMouseLeave={e=>e.currentTarget.style.opacity='0.35'}>
            <X size={15}/>
          </button>

          <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
            <div style={{ width:42, height:42, borderRadius:11, flexShrink:0,
              backgroundColor:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BarChart2 size={20} color="var(--primary)"/>
            </div>
            <div style={{ flex:1 }}>
              <h4 style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--text-main)', margin:'0 0 5px' }}>
                Allow Usage Tracking?
              </h4>
              <p style={{ fontSize:'0.78rem', color:'var(--text-main)', opacity:0.55,
                margin:'0 0 14px', lineHeight:1.5 }}>
                Hub tracks which URLs you visit to generate usage analytics.
                Your data is <strong style={{ color:'var(--text-main)', opacity:0.85 }}>only visible to admins</strong>.
                You can change this anytime in Settings.
              </p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <button onClick={() => setConsent(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px',
                    borderRadius:8, cursor:'pointer', backgroundColor:'var(--primary)',
                    border:'none', color:'white', fontSize:'0.82rem', fontWeight:700 }}>
                  <Check size={14}/> Allow
                </button>
                <button onClick={() => setConsent(false)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
                    borderRadius:8, cursor:'pointer', backgroundColor:'transparent',
                    border:'1px solid var(--border-color)',
                    color:'var(--text-main)', fontSize:'0.82rem', fontWeight:500 }}>
                  <Ban size={13}/> Decline
                </button>
                <span style={{ fontSize:'0.68rem', color:'var(--text-main)', opacity:0.35 }}>
                  🔒 Privacy first
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TrackingConsentBanner;