import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import useSocket from '../hooks/useSocket';
import DriverBottomNav from '../components/DriverBottomNav';
import StopCard from '../components/StopCard';

const FONT_FAMILY = "'Poppins', 'Segoe UI', sans-serif";
const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token');

const DeliveryStops = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const driverId = user?._id;

  const [orders, setOrders] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [startingId, setStartingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const socket = useSocket({ joinDriver: driverId });

  const fetchOrders = useCallback(async () => {
    if (!driverId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/drivers/${driverId}/orders`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = res.ok ? await res.json() : [];
      const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => {
        const sa = a.routeSequence ?? 999;
        const sb = b.routeSequence ?? 999;
        return sa - sb;
      });
      setOrders(sorted);
    } catch {
      // keep last-known list on a transient error
    } finally {
      setDataLoading(false);
    }
  }, [driverId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!socket || !driverId) return;
    const refresh = () => fetchOrders();
    socket.on('order_assigned', refresh);
    socket.on('route_updated', refresh);
    return () => {
      socket.off('order_assigned', refresh);
      socket.off('route_updated', refresh);
    };
  }, [socket, driverId, fetchOrders]);

  const handleStart = async (order) => {
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

  const totalDistance = orders.reduce((sum, o) => sum + (o.routeDistanceKm || 0), 0);
  const totalDuration = orders.reduce((sum, o) => sum + (o.routeDurationMin || 0), 0);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', paddingBottom: 96, fontFamily: FONT_FAMILY }}>

      <div style={{
        background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
        padding: '20px 18px 30px', color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>My Deliveries</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {dataLoading ? 'Loading route…' : `${orders.length} stop${orders.length === 1 ? '' : 's'} today`}
            </div>
          </div>
          <button
            onClick={() => navigate('/delivery-map')}
            style={{
              background: 'rgba(255,255,255,0.18)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
            }}
          >
            🗺️ Map
          </button>
        </div>
      </div>

      <div style={{ padding: '0 16px', marginTop: -18 }}>

        {actionError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, padding: '10px 12px', borderRadius: 12, marginTop: 14, marginBottom: 14 }}>
            {actionError}
          </div>
        )}

        {!dataLoading && orders.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 16, padding: 16, marginTop: 14, marginBottom: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.07)',
          }}>
            <div style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
              OPTIMIZED ROUTE
            </div>
            <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1e293b' }}>
              {totalDistance > 0 ? `${totalDistance.toFixed(1)} km` : '—'}
              {totalDuration > 0 ? ` · Est. ${totalDuration} min` : ''}
            </div>
          </div>
        )}

        {dataLoading ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13.5, marginTop: 14 }}>
            Loading deliveries…
          </div>
        ) : orders.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>✅</div>
            <div style={{ fontWeight: 800, color: '#334155' }}>No deliveries assigned right now</div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>New assignments will appear here automatically.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.map((order, i) => (
              <StopCard
                key={order._id}
                order={order}
                index={i}
                onStart={handleStart}
                startingId={startingId}
              />
            ))}
          </div>
        )}
      </div>

      <DriverBottomNav />
    </div>
  );
};

export default DeliveryStops;