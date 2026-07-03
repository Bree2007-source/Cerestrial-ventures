import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// FIX: Added 'export' here so other files can import this context
export const AuthContext = createContext();

const API = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Driver sessions don't have a /api/users/profile to refresh from —
    // restore them straight from localStorage instead.
    const storedRole = localStorage.getItem('cv-role');
    if (storedRole === 'driver') {
      const storedUser = localStorage.getItem('cv-user');
      const storedToken = localStorage.getItem('cv-token');
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
      setLoading(false);
      return;
    }

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
      // Keep cv-role in sync with the real role too, in case it ever changes server-side
      if (userData.role) {
        localStorage.setItem('cv-role', userData.role);
      }
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
      // Use the role the backend actually returned, don't assume 'customer'
      finishLogin(data.token, data.user, data.user.role || 'customer');
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
      finishLogin(data.token, data.user, data.user.role || 'customer');
      return { user: data.user, token: data.token, error: null };
    }
    if (data.user) {
      return { user: data.user, token: null, error: null };
    }
    throw new Error(data.message || 'Registration failed.');
  };

  // Driver login goes through the dedicated driver authentication endpoint.
  // This preserves the existing customer/admin login flow while ensuring
  // driver credentials are validated against the Driver model.
  const loginDriver = async (email, password) => {
    const { data } = await axios.post(`${API}/api/auth/driver-login`, { email, password });
    if (!data.success || !data.token || !data.user) {
      throw new Error(data.message || 'Driver login failed.');
    }

    // Guard: don't let a non-driver account in through the driver tab,
    // and don't let the frontend silently mislabel the role.
    if (data.user.role !== 'driver') {
      throw new Error('This account is not registered as a driver.');
    }

    finishLogin(data.token, data.user, data.user.role);
    return { user: data.user, token: data.token, error: null };
  };

  const finishLogin = (jwtToken, userData, role = 'customer') => {
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('cv-token', jwtToken);
    localStorage.setItem('cv-user', JSON.stringify(userData));
    localStorage.setItem('cv-role', role);
    setToken(jwtToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('cv-token');
    localStorage.removeItem('cv-user');
    localStorage.removeItem('cv-location');
    localStorage.removeItem('cv-role');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const saveUserLocation = useCallback(async ({ lat, lng, address }) => {
    const location = { lat, lng, address };
    localStorage.setItem('cv-location', JSON.stringify(location));
    setUser(prev => prev ? { ...prev, location } : prev);

    try {
      const tkn = localStorage.getItem('cv-token') || localStorage.getItem('token');
      if (!tkn) return;
      await axios.patch(
        `${API}/api/users/location`,
        { lat, lng, address },
        { headers: { Authorization: `Bearer ${tkn}` } }
      );
    } catch (err) {
      console.warn('[AuthContext] saveUserLocation backend save failed:', err.message);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, loginDriver, logout, fetchProfile, saveUserLocation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Keep this hook as an easy way to access the context
export const useAuth = () => useContext(AuthContext);