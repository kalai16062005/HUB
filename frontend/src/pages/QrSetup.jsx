import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { QrCode, Globe, Linkedin, Youtube } from 'lucide-react';
import companyLogo from '../assets/hub-company.png'; 

const QrSetup = () => {
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Get username from state or localStorage
  const username = location.state?.username || localStorage.getItem("username");

  useEffect(() => {
    const fetchQR = async () => {
      if (!username) {
        console.error("Username missing!");
        setLoading(false);
        return;
      }

      try {
        // 🚩 FIXED: Path updated to match your backend (auth.js)
        const response = await fetch("http://localhost:5000/api/auth/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username })
        });

        const data = await response.json();
        
        // 🚩 Check for success and qrCode field
        if (data.success && data.qrCode) {
          setQr(data.qrCode); 
        } else {
          console.error("QR Error:", data.message);
        }
      } catch (err) {
        console.error("Network Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQR();
  }, [username]);

  const handleNextStep = () => {
    if (qr) {
      navigate('/otp-verify', { state: { username } });
    } else {
      alert("QR code loading... Please wait.");
    }
  };

  return (
    <div style={{ 
      width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ 
        width: '100%', maxWidth: '440px', backgroundColor: '#ffffff',
        borderRadius: '16px', padding: '40px 30px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
        textAlign: 'center', border: '1px solid #eef2f6'
      }}>
        <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'center' }}>
          <img src={companyLogo} alt="Hub" style={{ height: '42px', objectFit: 'contain' }} />
        </div>
        
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '4px', color: '#1e293b' }}>Hub</h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '25px' }}>Private Enterprise Hub Portal</p>
        
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '20px', color: '#334155' }}>
          Scan QR Code to Login
        </h3>

        <div style={{ position: 'relative', display: 'inline-block', padding: '25px', background: '#ffffff', marginBottom: '20px' }}>
          {qr ? (
            <div style={{ position: 'relative' }}>
               <img src={qr} alt="QR Code" style={{ width: '160px', height: '160px', borderRadius: '8px' }} />
               {/* Blue Scanning Line Animation Effect */}
               <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: '#3b82f6', opacity: 0.5, boxShadow: '0 0 8px #3b82f6' }}></div>
            </div>
          ) : (
            <div style={{ width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '1px dashed #cbd5e0', borderRadius: '8px' }}>
              {loading ? "Loading QR..." : "Failed to Load"}
            </div>
          )}
          
          {/* Decorative Corner Borders */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: '3px solid #64748b', borderLeft: '3px solid #64748b', borderRadius: '12px 0 0 0' }}></div>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: '3px solid #64748b', borderRight: '3px solid #64748b', borderRadius: '0 12px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: '3px solid #64748b', borderLeft: '3px solid #64748b', borderRadius: '0 0 0 12px' }}></div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '3px solid #64748b', borderRight: '3px solid #64748b', borderRadius: '0 0 12px 0' }}></div>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.5', margin: '0 20px 30px' }}>
          Scan this using Google/Microsoft Authenticator app.<br/>After scanning, click the button below.
        </p>

        <button 
          onClick={handleNextStep} 
          style={{
            width: '100%', padding: '14px', backgroundColor: '#2563eb', color: 'white',
            borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
          }}
        >
          <QrCode size={18} /> Continue to OTP
        </button>

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#64748b' }}>
          cancel or <Link to="/login" style={{ color: '#64748b', textDecoration: 'none' }}>back to login</Link>
        </div>
      </div>

      <footer style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Globe size={20} color="#2563eb" />
          <Linkedin size={20} color="#2563eb" />
          <Youtube size={20} color="#2563eb" />
        </div>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
          © 2026 Hub Robotic LLP. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default QrSetup;