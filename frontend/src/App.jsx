import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { LogOut, ShieldAlert } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MainViewer from './components/MainViewer';
import AddUrlModal from './components/AddUrlModal';
import UserManagement from './components/admin/UserManagement';
import UrlManagement from './components/admin/UrlManagement';
import IframePayloadTester from './components/admin/IframePayloadTester';
import AuditLogViewer from './components/admin/AuditLogViewer';
import AnalyticsDashboard from './components/admin/AnalyticsDashboard';
import ChangePassword from './pages/ChangePassword';
import Login from './pages/Login';
import QrSetup from './pages/QrSetup';
import OtpVerify from './pages/OtpVerify';
import Settings from './pages/Settings';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Security from './components/admin/SessionHistory';
import FolderPage from './components/FolderPage';
import TrackingConsentBanner from './components/TrackingConsentBanner';


const API           = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const POLL_INTERVAL = 30_000;

const PATH_TO_VIEW = {
  '/dashboard':                'urls',
  '/dashboard/security':       'security',
  '/dashboard/iframe-tester':  'iframeTester',
  '/dashboard/settings':       'settings',
  '/dashboard/activity':       'activity',
  '/dashboard/audit-logs':     'auditLogs',
};


// ─── InactivityWarningModal ───────────────────────────────────────────────────
const InactivityWarningModal = ({ onStay, onLogout }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 99999,
    backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  }}>
    <div style={{
      backgroundColor: 'var(--sidebar-bg)', border: '1px solid var(--border-color)',
      borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 400,
      boxShadow: '0 24px 64px rgba(0,0,0,0.3)', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px',
        backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ShieldAlert size={26} color="#f59e0b" />
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 10px' }}>
        Still there?
      </h3>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', opacity: 0.55, margin: '0 0 26px', lineHeight: 1.5 }}>
        You've been inactive for a while.<br />
        You'll be logged out automatically soon unless you stay active.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={onLogout}
          style={{ padding: '10px 20px', borderRadius: 9, cursor: 'pointer',
            backgroundColor: 'transparent', border: '1px solid var(--border-color)',
            color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6 }}>
          <LogOut size={14} /> Logout now
        </button>
        <button onClick={onStay}
          style={{ padding: '10px 24px', borderRadius: 9, cursor: 'pointer',
            backgroundColor: 'var(--primary)', border: 'none',
            color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>
          Stay logged in
        </button>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();


  const activeView = PATH_TO_VIEW[location.pathname] || 'urls';

  const [urls, setUrls]                             = useState([]);
  const [usersList, setUsersList]                   = useState([]);
  const [activeUrl, setActiveUrl]                   = useState(null);
  const [isModalOpen, setIsModalOpen]               = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen]         = useState(false);
  const [isUrlMgmtOpen, setIsUrlMgmtOpen]           = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [openFolder, setOpenFolder]                 = useState(null);

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('__hub_favorites__') || '[]'); }
    catch { return []; }
  });
  const [pinned, setPinned] = useState(() => {
    try { return JSON.parse(localStorage.getItem('__hub_pinned__') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('__hub_favorites__', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('__hub_pinned__', JSON.stringify(pinned));
  }, [pinned]);

  const cfg = useCallback(() => ({
    headers: { Authorization: `Bearer ${user?.token}` },
  }), [user?.token]);

  const fetchUrls = useCallback(async ({ silent = false } = {}) => {
    if (!user?.token) return;
    try {
      const { data } = await axios.get(`${API}/api/urls`, cfg());
      setUrls(data);
      setActiveUrl(prev => {
        if (!prev) return data.length > 0 ? data[0] : null;
        return data.find(u => u._id === prev._id) || prev;
      });
    } catch (err) {
      if (!silent) console.error('fetchUrls failed', err);
    }
  }, [user?.token, cfg]);

  const fetchUsers = useCallback(async () => {
    if (!user?.token || user?.role !== 'admin') return;
    try {
      const { data } = await axios.get(`${API}/api/admin/users`, cfg());
      setUsersList(data);
    } catch (err) {
      console.error('fetchUsers failed', err);
    }
  }, [user?.token, user?.role, cfg]);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchUrls();
      await fetchUsers();
    };
    loadInitialData();
  }, [fetchUrls, fetchUsers]);

  useEffect(() => {
    if (!user?.token) return;
    const t = setInterval(() => fetchUrls({ silent: true }), POLL_INTERVAL);
    return () => clearInterval(t);
  }, [user?.token, fetchUrls]);

  useEffect(() => {
    if (!user?.token) return;
    const validateSession = async () => {
      try {
        await axios.get(`${API}/api/auth/sessions`, cfg());
      } catch {
        // The AuthContext axios interceptor will handle 401 logouts.
      }
    };
    validateSession();
    const id = setInterval(validateSession, 15_000);
    return () => clearInterval(id);
  }, [user?.token, cfg]);

  useEffect(() => {
    if (!user?.token || user?.role !== 'admin') return;
    const t = setInterval(() => fetchUsers(), 60_000);
    return () => clearInterval(t);
  }, [user?.token, user?.role, fetchUsers]);

  const handleAddUrl = async (newUrl) => {
    const tempId    = `temp-${Date.now()}`;
    const tempEntry = {
      _id: tempId, name: newUrl.name, url: newUrl.url,
      assignedTo: [], healthStatus: 'unknown', favicon: null,
    };
    setUrls(prev => [...prev, tempEntry]);
    if (!activeUrl) setActiveUrl(tempEntry);
    try {
      const { data } = await axios.post(`${API}/api/urls`, newUrl, cfg());
      setUrls(prev => prev.map(u => u._id === tempId ? data : u));
      setActiveUrl(prev => prev?._id === tempId ? data : prev);
    } catch {
      setUrls(prev => prev.filter(u => u._id !== tempId));
      if (activeUrl?._id === tempId) setActiveUrl(null);
      alert('Failed to add URL');
    }
  };

  const handleUrlSelect = (url) => {
    setActiveUrl(url);
    setOpenFolder(null);
    navigate('/dashboard');
  };

  const handleToggleFav = (id) =>
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleTogglePin = (id) =>
    setPinned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handlePing = async (id) => {
    console.log('Ping:', id);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar
        urls={urls}
        activeUrl={activeUrl}
        onUrlSelect={handleUrlSelect}
        onAddClick={() => setIsModalOpen(true)}
        onUserMgmtClick={() => setIsUserMgmtOpen(true)}
        onUrlMgmtClick={() => setIsUrlMgmtOpen(true)}
        onOpenIframeTester={() => navigate('/dashboard/iframe-tester')}
        onAuditLogClick={() => navigate('/dashboard/audit-logs')}
        onSettingsClick={() => navigate('/dashboard/settings')}
        onLogout={logout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(p => !p)}
        activeView={activeView}
        onActivityClick={() => navigate('/dashboard/activity')}
        onSecurityClick={() => navigate('/dashboard/security')}
        onUrlAdded={fetchUrls}
        onFolderOpen={(path) => setOpenFolder(path)}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <TrackingConsentBanner />

        {openFolder ? (
          <FolderPage
            folderPath={openFolder}
            urls={urls}
            favorites={favorites}
            pinned={pinned}
            onBack={() => setOpenFolder(null)}
            onFolderOpen={(path) => setOpenFolder(path)}
            onUrlSelect={handleUrlSelect}
            onUrlAdded={() => fetchUrls()}
            onToggleFav={handleToggleFav}
            onTogglePin={handleTogglePin}
            onPing={handlePing}
            userToken={user?.token}
            isAdmin={user?.role === 'admin'}
          />
        ) : (
          <>
            <AuditLogViewer
              isOpen={activeView === 'auditLogs'}
              onClose={() => navigate('/dashboard')}
            />
            <AnalyticsDashboard
              isOpen={activeView === 'activity'}
              onClose={() => navigate('/dashboard')}
            />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {activeView === 'iframeTester' && <IframePayloadTester />}
              {activeView === 'security' && (
                user?.role === 'admin'
                  ? <div style={{ padding: '20px' }}><Security /></div>
                  : <>{navigate('/dashboard')}</>
              )}
              {activeView === 'settings' && <Settings />}
              {activeView === 'urls'     && <MainViewer activeUrl={activeUrl} />}
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      <AddUrlModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddUrl}
        users={usersList}
      />

      {isUserMgmtOpen && (
        <UserManagement
          isOpen={isUserMgmtOpen}
          onClose={() => { setIsUserMgmtOpen(false); fetchUsers(); }}
        />
      )}

      {isUrlMgmtOpen && (
        <UrlManagement
          users={usersList}
          onClose={() => { setIsUrlMgmtOpen(false); fetchUrls(); }}
        />
      )}

    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && user.role !== 'admin' && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, authReady } = useAuth();
  if (!authReady) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      Loading...
    </div>
  );
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/qr-setup"        element={<PublicRoute><QrSetup /></PublicRoute>} />
          <Route path="/otp-verify"      element={<PublicRoute><OtpVerify /></PublicRoute>} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
          <Route path="/dashboard"               element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/security"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/iframe-tester" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/settings"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/activity"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/audit-logs"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;