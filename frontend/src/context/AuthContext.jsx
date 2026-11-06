import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContextValue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser]                       = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [authReady, setAuthReady]             = useState(false);
  const [trackingConsent, setTrackingConsent] = useState(null); // null | true | false
  const isInitialized   = useRef(false);
  const isLoggingOutRef = useRef(false);

  // ── Initial load from localStorage ──────────────────────────────────────────
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const saved = localStorage.getItem('hub-user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        axios.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`;
        setUser(parsed);
      } catch {
        localStorage.removeItem('hub-user');
      }
    }
    setAuthReady(true);
  }, []);

  // ── Sync user → localStorage + axios header ──────────────────────────────────
  useEffect(() => {
    if (!authReady) return;
    if (user) {
      localStorage.setItem('hub-user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
    } else {
      localStorage.removeItem('hub-user');
      delete axios.defaults.headers.common['Authorization'];
      setTrackingConsent(null);
    }
  }, [user, authReady]);

  // ── Axios 401 interceptor — auto logout if session revoked by admin ───────────
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response?.status === 401 &&
          !isLoggingOutRef.current &&
          // Don't trigger on login/otp routes
          !error.config?.url?.includes('/api/auth/login') &&
          !error.config?.url?.includes('/api/auth/login-otp')
        ) {
          isLoggingOutRef.current = true;
          localStorage.removeItem('hub-user');
          setUser(null);
          isLoggingOutRef.current = false;
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // ── Fetch tracking consent once user logs in ──────────────────────────────────
  useEffect(() => {
    if (!user?.token) return;
    axios.get(`${API_URL}/api/analytics/my-consent`)
      .then(r => setTrackingConsent(r.data.trackingConsent))
      .catch(() => {});
  }, [user?.token]);

  // ── Login ─────────────────────────────────────────────────────────────────────
  const login = async (username, password) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/login`, { username, password });

      if (data.requires2FA) {
        localStorage.setItem('username', username);
        return { success: true, requires2FA: true, username: data.username || username };
      }

      localStorage.removeItem('username');
      setUser(data);
      return {
        success: true,
        requires2FA: false,
        mustChangePassword: data.mustChangePassword,
        userRole: data.role,
      };
    } catch (error) {
      if (error.response?.status === 403) {
        return { success: false, alreadyInUse: true, message: error.response.data.message };
      }
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const complete2FALogin = (userData) => setUser(userData);

  const updateUser = (updatedUser) => setUser(updatedUser);

  // ── Set tracking consent ──────────────────────────────────────────────────────
  const setConsent = async (consent) => {
    try {
      await axios.post(`${API_URL}/api/analytics/consent`, { consent });
      setTrackingConsent(consent);
    } catch (err) {
      console.error('Consent update failed:', err);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────────
  const logout = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch (err) {
      console.error('Logout API failed:', err);
    } finally {
      setUser(null);
      isLoggingOutRef.current = false;
    }
  };

  if (!authReady) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      Loading...
    </div>
  );

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading,
      complete2FALogin, updateUser, authReady,
      trackingConsent, setConsent,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;