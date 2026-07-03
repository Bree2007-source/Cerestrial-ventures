import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import useSocket from '../hooks/useSocket';
import DriverBottomNav from '../components/DriverBottomNav';

const FONT_FAMILY = "'Poppins', 'Segoe UI', sans-serif";

// Loads Poppins from Google Fonts once, app-wide, the first time this
// component mounts (cheap no-op on subsequent mounts).
if (typeof document !== 'undefined' && !document.getElementById('poppins-font-link')) {
  const link = document.createElement('link');
  link.id = 'poppins-font-link';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
}

const DriverDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const driverId = user?._id;

  const [stats, setStats] = useState({ total: 0, completed: 0, remaining: 0, earnings: 0 });
  const [activeOrders, setActiveOrders] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [startingId, setStartingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const socket = useSocket({ joinDriver: driverId });
  const watchIdRef = useRef(null);

  const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token');

  // ── Fetch this driver's assigned orders + completed history ──────────────
  const fetchDriverData = useCallback(async () => {
    if (!driverId) return;
    try {
      const [ordersRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/drivers/${driverId}/orders`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_BASE_URL}/orders/driver/${driverId}/history`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const active = ordersRes.ok ? await ordersRes.json() : [];
      const history = historyRes.ok ? await historyRes.json() : [];

      const sortedActive = [...(Array.isArray(active) ? active : [])].sort((a, b) => {
        const sa = a.routeSequence ?? 999;
        const sb = b.routeSequence ?? 999;
        return sa - sb;
      });

      const completedToday = history.filter((o) => {
        const d = new Date(o.updatedAt);
        return d.toDateString() === new Date().toDateString() && o.status !== 'Cancelled';
      });

      const earningsToday = completedToday.reduce(
        (sum, o) => sum + (o.deliveryFee || 0),
        0
      );

      setActiveOrders(sortedActive);
      setStats({
        total: sortedActive.length + completedToday.length,
        completed: completedToday.length,
        remaining: sortedActive.length,
        earnings: earningsToday,
      });
    } catch {
      // Leave stats at last-known values rather than wiping them on a transient error
    } finally {
      setDataLoading(false);
    }
  }, [driverId]);

  // ── Fetch unread notification count for the bell badge ───────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!driverId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/drivers/${driverId}/notifications`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(Array.isArray(data) ? data.filter((n) => !n.read).length : 0);
    } catch {
      // leave last-known count on a transient error
    }
  }, [driverId]);

  useEffect(() => {
    fetchDriverData();
    fetchUnreadCount();
  }, [fetchDriverData, fetchUnreadCount]);

  useEffect(() => {
    if (!socket || !driverId) return;
    const refresh = () => fetchDriverData();
    const refreshUnread = () => fetchUnreadCount();
    socket.on('order_assigned', refresh);
    socket.on('route_updated', refresh);
    socket.on('order_assigned', refreshUnread);
    socket.on('driver_notification', refreshUnread);
    return () => {
      socket.off('order_assigned', refresh);
      socket.off('route_updated', refresh);
      socket.off('order_assigned', refreshUnread);
      socket.off('driver_notification', refreshUnread);
    };
  }, [socket, driverId, fetchDriverData, fetchUnreadCount]);

  const hasActiveDeliveries = activeOrders.length > 0;
  const nextStop = activeOrders[0] || null;
  const nearbyStops = activeOrders.slice(1, 4);
  const totalRouteDistanceKm = activeOrders.reduce((sum, order) => sum + (order.routeDistanceKm || 0), 0);
  const estimatedTimeMin = activeOrders.reduce((sum, order) => sum + (order.routeDurationMin || 0), 0);

  useEffect(() => {
    if (!driverId || !navigator.geolocation) return;

    if (!hasActiveDeliveries) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationError('');

        fetch(`${API_BASE_URL}/drivers/${driverId}/location`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ lat: latitude, lng: longitude, address: '' }),
        }).catch(() => { /* next watchPosition tick will retry */ });
      },
      () => setLocationError('Location access is off — turn it on so customers and admin can see where you are.'),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [driverId, hasActiveDeliveries]);

  const handleStartDelivery = async (order) => {
    setActionError('');
    setStartingId(order._id);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${order._id}/start-delivery`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.message || 'Could not start this delivery.');
        return;
      }
      navigate(`/delivery-details/${order._id}`);
    } catch {
      setActionError('Network error — please try again.');
    } finally {
      setStartingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Loading...
      </div>
    );
  }

  if (!driverId) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f8fafc' }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <p style={{ fontSize: 30, marginBottom: 10 }}>⚠️</p>
          <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Driver session not found</h2>
          <p style={{ fontSize: 13.5, color: '#64748b', marginBottom: 18 }}>
            We couldn't find a driver ID on your account. Please log out and log back in.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ background: '#15803d', color: '#fff', padding: '10px 22px', borderRadius: 10, fontWeight: 800, border: 'none', cursor: 'pointer' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const estimatedTimeLabel = dataLoading
    ? '—'
    : estimatedTimeMin >= 60
      ? `${Math.floor(estimatedTimeMin / 60)}h ${Math.round(estimatedTimeMin % 60)}m`
      : `${Math.round(estimatedTimeMin)} min`;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const INK = '#1c1f1e';
  const MUTED = '#767f79';
  const BORDER = '#e6e8e4';
  const GREEN = '#12633f';
  const GREEN_SOFT = '#eaf3ec';
  const AMBER = '#b45f06';
  const AMBER_SOFT = '#fdf2e3';
  const BG = '#faf9f7';

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: BG, paddingBottom: 100, fontFamily: FONT_FAMILY, color: INK }}>

      {/* ── 1. Welcome Section ──────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: GREEN, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16,
              flexShrink: 0,
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'D'}
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: INK, lineHeight: 1.25 }}>
                {greeting}, {(user?.name || 'Driver').split(' ')[0]}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>Online</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/driver-notifications')}
            aria-label="Notifications"
            style={{
              position: 'relative', width: 40, height: 40, borderRadius: 12, border: `1px solid ${BORDER}`,
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <IconBell color={INK} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5, background: AMBER, color: '#fff',
                fontSize: 9.5, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                border: '2px solid #fff',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: '18px 16px 0' }}>

        {locationError && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: 12, padding: '10px 12px', borderRadius: 10, marginBottom: 14 }}>
            {locationError}
          </div>
        )}
        {actionError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, padding: '10px 12px', borderRadius: 10, marginBottom: 14 }}>
            {actionError}
          </div>
        )}

        {/* ── 2. Today's Summary ──────────────────────────────────────────── */}
        <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
          Today's Summary
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
          background: BORDER, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20,
        }}>
          <StatItem icon={<IconPackage color={GREEN} />} value={dataLoading ? '—' : stats.total} label="Assigned" />
          <StatItem icon={<IconCheck color={GREEN} />} value={dataLoading ? '—' : stats.completed} label="Completed" />
          <StatItem icon={<IconPackage color={GREEN} />} value={dataLoading ? '—' : stats.remaining} label="Remaining" />
          <StatItem icon={<IconMapPin color={GREEN} />} value={dataLoading ? '—' : totalRouteDistanceKm.toFixed(1)} label="Route km" />
          <StatItem icon={<IconClock color={GREEN} />} value={estimatedTimeLabel} label="Est. time" span />
        </div>

        {/* ── 3. Suggested Stop ───────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${AMBER}`,
          padding: '18px 18px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{
              background: AMBER_SOFT, color: AMBER, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4,
              textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999,
            }}>
              Suggested
            </span>
          </div>

          <div style={{ fontSize: 17, fontWeight: 700, color: INK, marginBottom: 3 }}>
            {nextStop?.customerName || 'No upcoming stop'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: MUTED, fontSize: 13, marginBottom: 12 }}>
            <IconMapPin color={MUTED} size={14} />
            <span>{nextStop?.location || 'Hang tight — your next delivery will appear here.'}</span>
            {nextStop?.routeDistanceKm != null && (
              <>
                <span style={{ color: BORDER }}>•</span>
                <span style={{ fontWeight: 700, color: GREEN }}>{nextStop.routeDistanceKm.toFixed(1)} km</span>
              </>
            )}
          </div>

          {nextStop && (nextStop.paymentStatus || nextStop.status) && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {nextStop.paymentStatus && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, background: GREEN_SOFT, color: GREEN,
                  fontSize: 11.5, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
                }}>
                  <IconCard color={GREEN} size={13} /> {nextStop.paymentStatus}
                </span>
              )}
              {nextStop.status && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', color: '#334155',
                  fontSize: 11.5, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
                }}>
                  {nextStop.status}
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: nextStop ? 0 : 12 }}>
            <button
              onClick={() => nextStop && handleStartDelivery(nextStop)}
              disabled={!nextStop}
              style={{
                flex: 1, minWidth: 150, background: GREEN, color: '#fff', border: 'none', borderRadius: 14,
                padding: '15px 0', fontWeight: 800, fontSize: 15, cursor: nextStop ? 'pointer' : 'not-allowed',
                boxShadow: nextStop ? '0 12px 24px rgba(18, 99, 63, 0.18)' : 'none',
              }}
            >
              Start Delivery
            </button>
            <button
              onClick={() => nextStop && window.open(`https://www.google.com/maps?q=${nextStop.coordinates?.lat},${nextStop.coordinates?.lng}`, '_blank')}
              disabled={!nextStop}
              style={{
                flex: 1, minWidth: 120, background: '#fff', color: INK, border: `1px solid ${BORDER}`, borderRadius: 14,
                padding: '15px 0', fontWeight: 700, fontSize: 15, cursor: nextStop ? 'pointer' : 'not-allowed',
              }}
            >
              Navigate
            </button>
          </div>

          <div style={{ fontSize: 11, color: MUTED, marginTop: 12, textAlign: 'center' }}>
            Just a suggestion — pick any stop from your list below.
          </div>
        </div>

        {/* ── 4. Nearby Stops ─────────────────────────────────────────────── */}
        <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
          Nearby Stops
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, marginBottom: 12, overflow: 'hidden' }}>
          {nearbyStops.length === 0 ? (
            <div style={{ padding: 18, color: MUTED, fontSize: 13.5 }}>No nearby stops available yet.</div>
          ) : nearbyStops.map((order, index) => (
            <div
              key={order._id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px', borderBottom: index < nearbyStops.length - 1 ? `1px solid ${BORDER}` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: GREEN_SOFT, color: GREEN,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11.5,
                  flexShrink: 0,
                }}>
                  {index + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: INK, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.customerName}
                  </div>
                  {order.location && (
                    <div style={{ fontSize: 11.5, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.location}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ color: GREEN, fontSize: 12.5, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                {order.routeDistanceKm != null ? `${order.routeDistanceKm.toFixed(1)} km` : '-- km'}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/my-deliveries')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: '#fff', color: GREEN, border: `1px solid ${BORDER}`, borderRadius: 12,
            padding: '13px 0', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', marginBottom: 20,
          }}
        >
          View All Deliveries <IconChevron color={GREEN} size={14} />
        </button>
      </div>

      <DriverBottomNav />
    </div>
  );
};

const StatItem = ({ icon, value, label, span }) => (
  <div style={{
    background: '#fff', padding: '14px 10px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 6, gridColumn: span ? 'span 3' : undefined,
  }}>
    {icon}
    <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1f1e', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    <div style={{ fontSize: 10.5, fontWeight: 600, color: '#767f79' }}>{label}</div>
  </div>
);

/* ── Minimal stroke icon set (no external icon library dependency) ────────── */
const IconBell = ({ color = '#1c1f1e', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconPackage = ({ color = '#1c1f1e', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </svg>
);
const IconMapPin = ({ color = '#1c1f1e', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const IconClock = ({ color = '#1c1f1e', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);
const IconCheck = ({ color = '#1c1f1e', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);
const IconNav = ({ color = '#1c1f1e', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 11 19-9-9 19-2-8-8-2Z" />
  </svg>
);
const IconCard = ({ color = '#1c1f1e', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);
const IconChevron = ({ color = '#1c1f1e', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const Stat = ({ label, value, color }) => (
  <div>
    <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 19, fontWeight: 800, color }}>{value}</div>
  </div>
);

export default DriverDashboard;