import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Header = ({ selectedCategory, setSelectedCategory }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, wishlist } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  const isAdminPage = location.pathname === '/admin';
  const wishlistCount = wishlist ? wishlist.length : 0;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) await markAsRead(notification._id);
    setBellOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const typeIcon = (type) => {
    if (type === 'order_placed') return '🛒';
    if (type === 'order_status') return '📦';
    if (type === 'low_stock') return '⚠️';
    if (type === 'new_customer') return '👤';
    return '🔔';
  };

  const categories = [
    'All', 'Sugar', 'Rice', 'Cooking Oil', 'Maize Flour',
    'Wheat Flour', 'Cereals', 'Snacks', 'Beverages',
    'Cleaning Products', 'Baby Products'
  ];

  return (
    <header style={{ backgroundColor: '#15803d', color: 'white', padding: '15px 20px', fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isAdminPage ? '0px' : '15px' }}>

        <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>🌾 CERESTRIAL VENTURES</h2>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>Wholesale & Retail Grocers</span>
        </Link>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>

          {/* NOTIFICATION BELL */}
          <div ref={bellRef} style={{ position: 'relative' }}>
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
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  minWidth: 18, height: 18, borderRadius: 9,
                  background: '#ef4444', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '800', padding: '0 4px'
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                width: 320, backgroundColor: '#fff', color: '#0f172a',
                borderRadius: 14, boxShadow: '0 18px 40px rgba(15,23,42,0.18)',
                zIndex: 50, overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', borderBottom: '1px solid #f1f5f9'
                }}>
                  <span style={{ fontSize: 14, fontWeight: '700' }}>
                    Notifications{unreadCount > 0 && (
                      <span style={{
                        background: '#ef4444', color: 'white',
                        borderRadius: 10, fontSize: 11,
                        padding: '1px 7px', marginLeft: 6
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      style={{
                        background: 'none', border: 'none',
                        color: '#15803d', fontSize: 12,
                        cursor: 'pointer', fontWeight: '600'
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {!user ? (
                  <div style={{ padding: '20px 16px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                    <Link to="/login" style={{ color: '#15803d', fontWeight: '700', textDecoration: 'none' }}>
                      Login to see notifications
                    </Link>
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                    🎉 You're all caught up!
                  </div>
                ) : (
                  <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                    {notifications.slice(0, 10).map((n) => (
                      <div
                        key={n._id}
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          display: 'flex', gap: 10, padding: '12px 16px',
                          cursor: 'pointer', borderBottom: '1px solid #f8fafc',
                          backgroundColor: n.read ? '#fff' : '#f0fdf4',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = n.read ? '#fff' : '#f0fdf4'}
                      >
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{typeIcon(n.type)}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 13,
                            fontWeight: n.read ? '500' : '700',
                            color: '#1e293b', marginBottom: 2
                          }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {!n.read && (
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#15803d', flexShrink: 0, marginTop: 4
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {user && (
                  <div style={{
                    padding: '10px 16px', borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'flex-end'
                  }}>
                    <Link
                      to="/profile"
                      onClick={() => setBellOpen(false)}
                      style={{ color: '#15803d', fontWeight: '600', textDecoration: 'none', fontSize: 12 }}
                    >
                      Notification settings →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px', padding: '6px 12px',
              cursor: 'pointer', color: 'white',
              fontSize: '13px', fontWeight: 'bold',
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

          {/* WISHLIST with count badge */}
          <Link to="/wishlist" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', position: 'relative' }}>
            💖 Wishlist
            {wishlistCount > 0 && (
              <span style={{
                position: 'absolute', top: -8, right: -10,
                minWidth: 16, height: 16, borderRadius: 8,
                background: '#facc15', color: '#1e293b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: '800', padding: '0 3px'
              }}>
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* ADMIN PANEL — only shown to admin users */}
          {user?.isAdmin && (
            <Link
              to="/admin"
              style={{
                color: '#15803d', backgroundColor: '#bbf7d0',
                textDecoration: 'none', fontWeight: 'bold',
                padding: '6px 12px', borderRadius: '4px'
              }}
            >
              🛡️ Admin Panel
            </Link>
          )}

        </div>
      </div>

      {!isAdminPage && (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px', marginTop: '10px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                backgroundColor: selectedCategory === cat ? '#facc15' : '#166534',
                color: selectedCategory === cat ? '#1e293b' : 'white',
                border: 'none', padding: '8px 14px',
                borderRadius: '20px', cursor: 'pointer',
                fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '13px'
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