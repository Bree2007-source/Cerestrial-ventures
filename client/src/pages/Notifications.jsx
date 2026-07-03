import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import useSocket from '../hooks/useSocket';
import DriverBottomNav from '../components/DriverBottomNav';

const FONT_FAMILY = "'Poppins', 'Segoe UI', sans-serif";
const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token');

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const driverId = user?._id;
  const socket = useSocket({ joinDriver: driverId });

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!driverId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/drivers/${driverId}/notifications`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = res.ok ? await res.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // keep previous list
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!socket || !driverId) return;
    const refresh = () => fetchNotifications();
    socket.on('order_assigned', refresh);
    socket.on('driver_notification', refresh);
    return () => {
      socket.off('order_assigned', refresh);
      socket.off('driver_notification', refresh);
    };
  }, [socket, driverId, fetchNotifications]);

  const handleTap = async (n) => {
    if (!n.read) {
      setItems(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
      fetch(`${API_BASE_URL}/drivers/${driverId}/notifications/${n._id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      }).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const unreadCount = items.filter(n => !n.read).length;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', paddingBottom: 96, fontFamily: FONT_FAMILY }}>

      <div style={{
        background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
        padding: '18px 18px 20px', color: '#fff',
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: 0.9, marginBottom: 4 }}>
          ← Back
        </button>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Notifications</div>
        {unreadCount > 0 && (
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{unreadCount} unread</div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', color: '#94a3b8' }}>
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔔</div>
            <div style={{ fontWeight: 800, color: '#334155' }}>You're all caught up</div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>New assignments and updates will show up here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(n => (
              <div
                key={n._id}
                onClick={() => handleTap(n)}
                style={{
                  background: '#fff', borderRadius: 14, padding: 14, cursor: 'pointer',
                  boxShadow: n.read ? '0 2px 8px rgba(0,0,0,0.04)' : '0 6px 18px rgba(21,128,61,0.1)',
                  border: n.read ? '1px solid #f1f5f9' : '1.5px solid #bbf7d0',
                  display: 'flex', gap: 10,
                }}
              >
                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#15803d', marginTop: 5, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: '#1e293b' }}>{n.title}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 6, fontWeight: 600 }}>{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DriverBottomNav />
    </div>
  );
};

export default Notifications;