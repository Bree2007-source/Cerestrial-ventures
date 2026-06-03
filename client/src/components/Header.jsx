import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Header = ({ selectedCategory, setSelectedCategory }) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const isAdminPage = location.pathname === '/admin';

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
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>

          {/* 🌙 Theme Toggle */}
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