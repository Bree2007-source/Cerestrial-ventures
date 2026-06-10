import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const parseStorageItem = (key, fallback) => {
    const storedValue = localStorage.getItem(key);
    if (!storedValue || storedValue === 'undefined' || storedValue === 'null') return fallback;
    try {
      return JSON.parse(storedValue);
    } catch (error) {
      console.warn(`Invalid JSON in localStorage for ${key}:`, error.message);
      localStorage.removeItem(key);
      return fallback;
    }
  };

  const [wishlist, setWishlist] = useState(() => parseStorageItem('cv-wishlist', []));

  useEffect(() => {
    localStorage.setItem('cv-wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const getHeaders = () => {
    const token = localStorage.getItem('cv-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchWishlistFromDB = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users/wishlist`, {
        headers: getHeaders(),
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setWishlist(data);
      localStorage.setItem('cv-wishlist', JSON.stringify(data));
    } catch (err) {
      console.warn('Could not sync wishlist from server:', err.message);
    }
  }, []);

  useEffect(() => {
    const storedUser = parseStorageItem('cv-user', null);
    if (storedUser) {
      setUser(storedUser);
      fetchWishlistFromDB();
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
    const userData = {
      _id: res.data._id,
      name: res.data.name,
      email: res.data.email,
      phone: res.data.phone,
      isAdmin: res.data.isAdmin,
      notificationPreferences: res.data.notificationPreferences,
    };
    setUser(userData);
    localStorage.setItem('cv-user', JSON.stringify(userData));
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('cv-token', res.data.token);
    localStorage.setItem('token', res.data.token);
    setTimeout(fetchWishlistFromDB, 100);
    return { user: userData, token: res.data.token };
  };

  const register = async (name, email, password, phone) => {
    const res = await axios.post(`${API_BASE_URL}/auth/register`, { name, email, password, phone });
    const userData = {
      _id: res.data._id,
      name: res.data.name,
      email: res.data.email,
      phone: res.data.phone,
      isAdmin: res.data.isAdmin,
      notificationPreferences: res.data.notificationPreferences,
    };
    setUser(userData);
    localStorage.setItem('cv-user', JSON.stringify(userData));
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('cv-token', res.data.token);
    localStorage.setItem('token', res.data.token);
    return { user: userData, token: res.data.token };
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const nextUser = { ...prev, ...updates };
      localStorage.setItem('cv-user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const addToWishlist = async (product) => {
    setWishlist((prev) => {
      if (prev.some((item) => item._id === product._id)) return prev;
      return [...prev, product];
    });
    if (user) {
      try {
        await axios.post(
          `${API_BASE_URL}/users/wishlist/${product._id}`,
          {},
          { headers: getHeaders() }
        );
      } catch (err) {
        console.warn('Wishlist sync failed:', err.message);
        setWishlist((prev) => prev.filter((item) => item._id !== product._id));
      }
    }
  };

  const removeFromWishlist = async (productId) => {
    setWishlist((prev) => prev.filter((item) => item._id !== productId));
    if (user) {
      try {
        await axios.post(
          `${API_BASE_URL}/users/wishlist/${productId}`,
          {},
          { headers: getHeaders() }
        );
      } catch (err) {
        console.warn('Wishlist remove sync failed:', err.message);
      }
    }
  };

  const toggleWishlist = (product) => {
    if (wishlist.some((item) => item._id === product._id)) {
      removeFromWishlist(product._id);
    } else {
      addToWishlist(product);
    }
  };

  const isInWishlist = (productId) => wishlist.some((item) => item._id === productId);

  const logout = () => {
    setUser(null);
    setWishlist([]);
    localStorage.removeItem('cv-user');
    localStorage.removeItem('cv-token');
    localStorage.removeItem('cv-wishlist');
  };

  return (
    <AuthContext.Provider value={{
      user, loading, wishlist, login, register, logout,
      addToWishlist, removeFromWishlist, toggleWishlist,
      isInWishlist, updateUser, fetchWishlistFromDB
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;