import React from 'react';
import { useNavigate } from 'react-router-dom';

// Same visual language as the cards on DriverDashboard.jsx — kept as a
// shared component so DriverDashboard and DeliveryStops.jsx never drift
// apart in how a stop is rendered.
const StopCard = ({ order, index, onStart, startingId }) => {
  const navigate = useNavigate();
  const isUnlocked = !order.deliveryLocked;

  return (
    <div
      style={{
        background: '#fff', borderRadius: 16, padding: 16,
        boxShadow: isUnlocked ? '0 10px 26px rgba(21,128,61,0.14)' : '0 4px 12px rgba(0,0,0,0.04)',
        border: isUnlocked ? '1.5px solid #bbf7d0' : '1px solid #f1f5f9',
        opacity: isUnlocked ? 1 : 0.65,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}
        onClick={() => navigate(`/delivery-details/${order._id}`)}
      >
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: isUnlocked ? '#15803d' : '#cbd5e1', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 13, flexShrink: 0,
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{order.customerName}</div>
          <div style={{ fontSize: 12.5, color: '#64748b' }}>{order.location}</div>
        </div>
        {isUnlocked ? (
          <span style={{ fontSize: 10, fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: 999 }}>
            ACTIVE
          </span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', background: '#f1f5f9', padding: '3px 8px', borderRadius: 999 }}>
            🔒 LOCKED
          </span>
        )}
      </div>

      {order.routeDistanceKm != null && (
        <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 12 }}>
          {order.routeDistanceKm} km · {order.routeDurationMin} min from previous stop
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {isUnlocked ? (
          <button
            onClick={() => onStart(order)}
            disabled={startingId === order._id}
            style={{
              flex: 1, background: '#15803d', color: '#fff', border: 'none',
              borderRadius: 10, padding: '11px', fontWeight: 800, fontSize: 13.5,
              cursor: startingId === order._id ? 'not-allowed' : 'pointer',
              opacity: startingId === order._id ? 0.7 : 1,
            }}
          >
            {startingId === order._id ? 'Starting…' : order.status === 'Driver On The Way' ? 'Continue Delivery' : 'Start Delivery'}
          </button>
        ) : (
          <button disabled style={{
            flex: 1, background: '#f1f5f9', color: '#94a3b8', border: 'none',
            borderRadius: 10, padding: '11px', fontWeight: 800, fontSize: 13.5, cursor: 'not-allowed',
          }}>
            Locked
          </button>
        )}
        {order.coordinates?.lat && order.coordinates?.lng && (
          <a
            href={`https://www.google.com/maps?q=${order.coordinates.lat},${order.coordinates.lng}`}
            target="_blank"
            rel="noreferrer"
            style={{
              background: '#f1f5f9', color: '#334155', borderRadius: 10,
              padding: '11px 16px', fontWeight: 800, fontSize: 13.5, textDecoration: 'none',
              display: 'flex', alignItems: 'center',
            }}
          >
            🗺️
          </a>
        )}
      </div>
    </div>
  );
};

export default StopCard;