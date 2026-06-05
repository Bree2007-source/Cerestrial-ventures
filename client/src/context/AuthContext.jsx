import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [wishlist, setWishlist] = useState(() => {
    const storedWishlist = localStorage.getItem('cv-wishlist');
    return storedWishlist ? JSON.parse(storedWishlist) : [];
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('cv-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    localStorage.setItem('cv-wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const login = async (email, password) => {
    const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
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
    localStorage.setItem('cv-token', res.data.token);
    return { user: userData, token: res.data.token };
  };

  const register = async (name, email, password, phone) => {
    const res = await axios.post('http://localhost:5000/api/auth/register', { name, email, password, phone });
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
    localStorage.setItem('cv-token', res.data.token);
    return { user: userData, token: res.data.token };
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const nextUser = { ...prev, ...updates };
      localStorage.setItem('cv-user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const addToWishlist = (product) => {
    setWishlist((prev) => {
      if (prev.some((item) => item._id === product._id)) return prev;
      return [...prev, product];
    });
  };

  const removeFromWishlist = (productId) => {
    setWishlist((prev) => prev.filter((item) => item._id !== productId));
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
    localStorage.removeItem('cv-user');
    localStorage.removeItem('cv-token');
  };

  return (
    <AuthContext.Provider value={{
      user, loading, wishlist, login, register, logout,
      addToWishlist, removeFromWishlist, toggleWishlist,
      isInWishlist, updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;