import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { key: 'home',       label: 'Home',       icon: '🏠', path: '/driver-dashboard' },
  { key: 'deliveries', label: 'Deliveries', icon: '📦', path: '/driver-deliveries' },
  { key: 'map',        label: 'Map',        icon: '🗺️', path: '/delivery-map' },
  { key: 'notifications', label: 'Alerts',   icon: '🔔', path: '/driver-notifications' },
  { key: 'profile',    label: 'Profile',    icon: '👤', path: '/driver-profile' },
];

const DriverBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#fff', borderTop: '1px solid #f1f5f9',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 4px calc(8px + env(safe-area-inset-bottom))',
        maxWidth: 480, margin: '0 auto',
        fontFamily: "'Poppins', 'Segoe UI', sans-serif",
      }}
    >
      {NAV_ITEMS.map(item => {
        const active = location.pathname === item.path;
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 12px', borderRadius: 10,
              color: active ? '#15803d' : '#94a3b8',
            }}
          >
            <span style={{ fontSize: 19 }}>{item.icon}</span>
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default DriverBottomNav;