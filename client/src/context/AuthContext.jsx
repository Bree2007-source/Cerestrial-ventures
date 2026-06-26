import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(`${API}/api/users/profile`);
      const userData = data.user || data;
      setUser(userData);
      localStorage.setItem('cv-user', JSON.stringify(userData));
    } catch (err) {
      console.error('[AuthContext] fetchProfile error:', err.response?.data || err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await axios.post(
      `${API}/api/auth/login`,
      { email, password },
      { withCredentials: true }
    );
    if (data.token && data.user) {
      finishLogin(data.token, data.user);
      return { user: data.user, token: data.token, error: null };
    }
    throw new Error(data.message || 'Login failed.');
  };

  const register = async (name, email, password, phone) => {
    const { data } = await axios.post(
      `${API}/api/auth/register`,
      { name, email, password, phone },
      { withCredentials: true }
    );
    if (data.token && data.user) {
      finishLogin(data.token, data.user);
      return { user: data.user, token: data.token, error: null };
    }
    if (data.user) {
      return { user: data.user, token: null, error: null };
    }
    throw new Error(data.message || 'Registration failed.');
  };

  const finishLogin = (jwtToken, userData) => {
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('cv-token', jwtToken);
    localStorage.setItem('cv-user', JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('cv-token');
    localStorage.removeItem('cv-user');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, logout, fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);