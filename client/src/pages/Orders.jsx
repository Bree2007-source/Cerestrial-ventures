import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

const statusSteps = [
  'Order Received', 'Payment Confirmed', 'Processing Order',
  'Packed', 'Out for Delivery', 'Delivered'
];

const statusColors = {
  'Delivered':         { bg: '#dcfce7', color: '#166534' },
  'Processing Order':  { bg: '#fef9c3', color: '#854d0e' },
  'Processing':        { bg: '#fef9c3', color: '#854d0e' },
  'Pending':           { bg: '#fef9c3', color: '#854d0e' },
  'Order Received':    { bg: '#dbeafe', color: '#1e40af' },
  'Payment Confirmed': { bg: '#dbeafe', color: '#1e40af' },
  'Packed':            { bg: '#ede9fe', color: '#5b21b6' },
  'Out for Delivery':  { bg: '#ffedd5', color: '#9a3412' },
  'Cancelled':         { bg: '#fee2e2', color: '#991b1b' },
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('cv-token');
        if (!token) { setError('Please log in to view orders.'); setLoading(false); return; }
        const res = await fetch(`${API_BASE_URL}/orders/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch orders');
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch {
        setError('Could not load orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const openMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
      <p style={{ color: '#64748b' }}>Loading your orders...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>
      <button onClick={() => navigate('/login')} style={{ padding: '10px 24px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
        Go to Login
      </button>
    </div>
  );

  if (!orders.length) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
      <p style={{ color: '#64748b', marginBottom: 16 }}>You have no orders yet.</p>
      <button onClick={() => navigate('/')} style={{ padding: '10px 24px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
        Start Shopping
      </button>
    </div>
  );

  return (
    <div style={{ padding: '16px', maxWidth: 900, margin: '0 auto', fontFamily: 'sans-serif', paddingBottom: 100, boxSizing: 'border-box' }}>

      <style>{`
        .order-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); background: #fff; }
        .order-header-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
        .order-header-cell { text-align: center; }
        .order-header-label { color: #64748b; font-size: 11px; display: block; margin-bottom: 2px; }
        .order-header-value { color: #15803d; font-weight: 800; font-size: 13px; }
        .order-items { font-size: 13px; color: #475569; background: #f1f5f9; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; line-height: 1.6; }
        .order-location { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }

        /* Progress tracker — scrollable on tiny screens */
        .progress-wrapper { overflow-x: auto; padding-bottom: 8px; -webkit-overflow-scrolling: touch; }
        .progress-track { position: relative; padding: 10px 0 0; min-width: 480px; }
        .progress-line-bg { position: absolute; top: 25px; left: 4%; right: 4%; height: 3px; background: #e2e8f0; z-index: 1; }
        .progress-line-fill { position: absolute; top: 25px; left: 4%; height: 3px; background: #15803d; z-index: 1; transition: width 0.5s ease; }
        .progress-steps { display: flex; justify-content: space-between; position: relative; z-index: 2; }
        .progress-step { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .progress-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; color: white; flex-shrink: 0; }
        .progress-label { font-size: 9px; text-align: center; margin-top: 5px; max-width: 60px; line-height: 1.3; }

        .order-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
        .track-btn { background: #15803d; color: white; border: none; border-radius: 8px; padding: '8px 16px'; cursor: pointer; font-size: 13px; font-weight: 700; white-space: nowrap; }

        @media (max-width: 480px) {
          .order-header-label { font-size: 10px; }
          .order-header-value { font-size: 12px; }
          .order-items { font-size: 12px; }
        }
      `}</style>

      <h2 style={{ color: '#1e293b', borderBottom: '2px solid #15803d', paddingBottom: 10, marginBottom: 20, fontSize: 'clamp(18px, 4vw, 24px)' }}>
        📦 My Orders
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 400, marginLeft: 10 }}>({orders.length} order{orders.length !== 1 ? 's' : ''})</span>
      </h2>

      {orders.map((order) => {
        const currentStepIndex = statusSteps.indexOf(order.status);
        const fillPercent = (Math.max(currentStepIndex, 0) / (statusSteps.length - 1)) * 92;
        const statusStyle = statusColors[order.status] || { bg: '#dbeafe', color: '#1e40af' };

        return (
          <div key={order._id} className="order-card">

            {/* Header */}
            <div className="order-header-grid">
              <div className="order-header-cell">
                <span className="order-header-label">Order ID</span>
                <span className="order-header-value">#{order._id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="order-header-cell">
                <span className="order-header-label">Date</span>
                <span className="order-header-value" style={{ color: '#334155' }}>
                  {new Date(order.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="order-header-cell">
                <span className="order-header-label">Total</span>
                <span className="order-header-value">KSh {(order.totalAmount || order.totalPrice || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Delivery location */}
            <div className="order-location">
              <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 3 }}>📍 Delivery Location</div>
              <div style={{ fontSize: 13, color: '#334155' }}>{order.location || 'Not specified'}</div>
              {order.latitude && order.longitude && (
                <button onClick={() => openMaps(order.latitude, order.longitude)}
                  style={{ marginTop: 5, background: 'none', border: 'none', padding: 0, color: '#1d4ed8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                  🗺️ View on Google Maps
                </button>
              )}
            </div>

            {/* Items */}
            <div className="order-items">
              🛒 {order.items?.map(i => `${i.name} ×${i.quantity}`).join(' · ') || 'No items'}
            </div>

            {/* Progress tracker */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10 }}>Delivery Progress</div>
            <div className="progress-wrapper">
              <div className="progress-track">
                <div className="progress-line-bg" />
                <div className="progress-line-fill" style={{ width: `${fillPercent}%` }} />
                <div className="progress-steps">
                  {statusSteps.map((step, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isCurrent   = index === currentStepIndex;
                    return (
                      <div key={step} className="progress-step">
                        <div className="progress-dot" style={{
                          backgroundColor: isCurrent ? '#facc15' : isCompleted ? '#15803d' : '#cbd5e1',
                          border: isCurrent ? '3px solid #166534' : 'none',
                        }}>
                          {isCompleted ? '✓' : index + 1}
                        </div>
                        <span className="progress-label" style={{
                          fontWeight: isCurrent || isCompleted ? 700 : 400,
                          color: isCurrent ? '#166534' : isCompleted ? '#15803d' : '#94a3b8',
                        }}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="order-footer">
              <span style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                {order.status || 'Order Received'}
              </span>
              <button
                onClick={() => navigate(`/track-order?id=${order._id}`)}
                style={{ backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
              >
                🗺️ Track Order
              </button>
            </div>

          </div>
        );
      })}
    </div>
  );
};

export default Orders;