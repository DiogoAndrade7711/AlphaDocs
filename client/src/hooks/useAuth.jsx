import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ad_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ad_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ data }) => { setUser(data); localStorage.setItem('ad_user', JSON.stringify(data)); })
      .catch(() => { localStorage.removeItem('ad_token'); localStorage.removeItem('ad_user'); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  function login(token, userData) {
    localStorage.setItem('ad_token', token);
    localStorage.setItem('ad_user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('ad_token');
    localStorage.removeItem('ad_user');
    setUser(null);
  }

  function updateUser(partial) {
    const updated = { ...user, ...partial };
    setUser(updated);
    localStorage.setItem('ad_user', JSON.stringify(updated));
  }

  return <AuthCtx.Provider value={{ user, loading, login, logout, updateUser }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
