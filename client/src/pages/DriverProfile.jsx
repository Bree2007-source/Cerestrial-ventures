import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DriverBottomNav from '../components/DriverBottomNav';

const FONT_FAMILY = "'Poppins', 'Segoe UI', sans-serif";

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #f1f5f9' }}>
    <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: 13.5, color: '#1e293b', fontWeight: 700 }}>{value || '—'}</span>
  </div>
);

const DriverProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', paddingBottom: 96, fontFamily: FONT_FAMILY }}>

      <div style={{
        background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
        padding: '24px 18px 44px', color: '#fff', textAlign: 'center',
      }}>
        <div style={{
          width: 66, height: 66, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26,
          margin: '0 auto 10px',
        }}>
          {user?.name?.charAt(0)?.toUpperCase() || 'D'}
        </div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{user?.name || 'Driver'}</div>
        <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>{user?.vehicleType || 'Delivery Driver'}</div>
      </div>

      <div style={{ padding: '0 16px', marginTop: -26 }}>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16,
        }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>{user?.completedDeliveries ?? 0}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>DELIVERIES</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>KSh {(user?.earnings ?? 0).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>TOTAL EARNED</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '4px 16px', marginBottom: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}>
          <Row label="Phone" value={user?.phone} />
          <Row label="Email" value={user?.email} />
          <Row label="Vehicle" value={user?.vehicleType} />
          <Row label="Registration" value={user?.vehicleRegistration} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0' }}>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Status</span>
            <span style={{
              fontSize: 11, fontWeight: 800, color: '#15803d', background: '#dcfce7',
              padding: '3px 10px', borderRadius: 999,
            }}>
              ● {user?.status || 'Available'}
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/driver-notifications')}
          style={{
            width: '100%', background: '#fff', color: '#334155', border: '1px solid #f1f5f9',
            borderRadius: 12, padding: '13px', fontWeight: 700, fontSize: 13.5, marginBottom: 10,
            cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          🔔 Notifications
        </button>

        <button
          onClick={handleLogout}
          style={{
            width: '100%', background: '#fff', color: '#dc2626', border: '1.5px solid #fecaca',
            borderRadius: 12, padding: '13px', fontWeight: 800, fontSize: 14, cursor: 'pointer',
          }}
        >
          Log Out
        </button>
      </div>

      <DriverBottomNav />
    </div>
  );
};

export default DriverProfile;
