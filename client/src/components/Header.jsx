import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Header = ({ selectedCategory, setSelectedCategory }) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [bellOpen, setBellOpen] = useState(false);

  const isAdminPage = location.pathname === '/admin';
  const notificationCount = user?.notificationPreferences
    ? Object.values(user.notificationPreferences).filter(Boolean).length
    : 0;
  const notificationsEnabled = notificationCount > 0;

  const categories = [
    'All', 'Sugar', 'Rice', 'Cooking Oil', 'Maize Flour',
    'Wheat Flour', 'Cereals', 'Snacks', 'Beverages',
    'Cleaning Products', 'Baby Products'
  ];

  return (
    <header style={{ backgroundColor: '#15803d', color: 'white', padding: '15px 20px', fontFamily: 'sans-serif' }}>

      {/* TOP ROW: Logo + Nav + Theme Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isAdminPage ? '0px' : '15px' }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>🌾 CERESTRIAL VENTURES</h2>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>Wholesale & Retail Grocers</span>
        </Link>

        {/* Right Side Nav */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>

          <button
            onClick={() => setBellOpen((prev) => !prev)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '10px',
              padding: '8px 10px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              position: 'relative',
            }}
          >
            🔔
            {notificationsEnabled && (
              <span style={{
                position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18,
                borderRadius: 9, background: '#facc15', color: '#1e293b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '800', padding: '0 4px'
              }}>
                {notificationCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              width: 280, backgroundColor: '#fff', color: '#0f172a',
              borderRadius: 14, boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
              padding: 18, zIndex: 20
            }}>
              <div style={{ fontSize: 14, fontWeight: '700', marginBottom: 10 }}>Notifications</div>
              {user ? (
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                  {notificationsEnabled
                    ? `You are subscribed to ${notificationCount} notification channel${notificationCount > 1 ? 's' : ''}.`
                    : 'Notifications are turned off. Enable them in your profile.'}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                  Login to manage your notification settings.
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <Link to={user ? '/profile' : '/login'}
                  style={{ color: '#15803d', fontWeight: '700', textDecoration: 'none', fontSize: 13 }}>
                  {user ? 'Open notification settings' : 'Login to continue'}
                </Link>
              </div>
            </div>
          )}

          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>

          <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
            🏠 Shop Home
          </Link>

          <Link to="/cart" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
            🛒 Cart
          </Link>

          <Link to="/wishlist" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
            💖 Wishlist
          </Link>

          <Link
            to="/admin"
            style={{
              color: '#15803d',
              backgroundColor: '#bbf7d0',
              textDecoration: 'none',
              fontWeight: 'bold',
              padding: '6px 12px',
              borderRadius: '4px'
            }}
          >
            🛡️ Admin Panel
          </Link>

        </div>
      </div>

      {/* CATEGORY TABS — hidden on admin page */}
      {!isAdminPage && (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px', marginTop: '10px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                backgroundColor: selectedCategory === cat ? '#facc15' : '#166534',
                color: selectedCategory === cat ? '#1e293b' : 'white',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                fontSize: '13px'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

    </header>
  );
};

export default Header;