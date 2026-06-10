import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

const statusSteps = [
  'Order Received', 'Payment Confirmed', 'Processing Order',
  'Packed', 'Out for Delivery', 'Delivered'
];

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
      } catch { setError('Could not load orders.'); }
      finally { setLoading(false); }
    };
    fetchOrders();
  }, []);

  const openMaps = (lat, lng) => {
    const url = 'https://www.google.com/maps?q=' + lat + ',' + lng;
    window.open(url, '_blank');
  };

  if (loading) return <div style={{ padding: 30, textAlign: 'center' }}><p>⏳ Loading your orders...</p></div>;
  if (error) return (
    <div style={{ padding: 30, textAlign: 'center' }}>
      <p style={{ color: 'red' }}>{error}</p>
      <button onClick={() => navigate('/login')} style={{ marginTop: 10, padding: '8px 20px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
        Go to Login
      </button>
    </div>
  );
  if (!orders.length) return (
    <div style={{ padding: 30, textAlign: 'center' }}>
      <p>🛍️ You have no orders yet.</p>
      <button onClick={() => navigate('/')} style={{ marginTop: 10, padding: '8px 20px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
        Start Shopping
      </button>
    </div>
  );

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto', fontFamily: 'sans-serif', paddingBottom: 80 }}>
      <h2 style={{ color: '#1e293b', borderBottom: '2px solid #15803d', paddingBottom: 10 }}>📦 My Orders</h2>

      {orders.map((order) => {
        const currentStepIndex = statusSteps.indexOf(order.status);
        return (
          <div key={order._id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>

            {/* Order Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, backgroundColor: '#f8fafc', padding: 15, borderRadius: 8, marginBottom: 15 }}>
              <div>
                <span style={{ color: '#64748b', fontSize: 13 }}>Order ID</span>
                <strong style={{ color: '#15803d', display: 'block' }}>#{order._id.slice(-6).toUpperCase()}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: 13 }}>Date</span>
                <strong style={{ color: '#334155', display: 'block' }}>{new Date(order.createdAt).toLocaleDateString()}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: 13 }}>Total</span>
                <strong style={{ color: '#15803d', display: 'block' }}>KSh {order.totalAmount || order.totalPrice}</strong>
              </div>
            </div>

            {/* Delivery Location */}
            <div style={{ marginBottom: 15, padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#166534', marginBottom: 4 }}>
                📍 Delivery Location Saved
              </div>
              <div style={{ fontSize: 13, color: '#334155' }}>{order.location || 'N/A'}</div>
              {order.latitude && order.longitude && (
                <button
                  onClick={() => openMaps(order.latitude, order.longitude)}
                  style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, color: '#1d4ed8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  🗺️ View on Google Maps
                </button>
              )}
            </div>

            {/* Items */}
            <div style={{ fontSize: 14, color: '#475569', backgroundColor: '#f1f5f9', padding: 10, borderRadius: 6, marginBottom: 15 }}>
              🛒 {order.items?.map(i => `${i.name} x${i.quantity}`).join(', ')}
            </div>

            {/* Progress Tracker */}
            <h4 style={{ color: '#475569', marginBottom: 15 }}>Delivery Progress:</h4>
            <div style={{ position: 'relative', padding: '10px 0' }}>
              <div style={{ position: 'absolute', top: 25, left: '5%', right: '5%', height: 3, backgroundColor: '#e2e8f0', zIndex: 1 }} />
              <div style={{ position: 'absolute', top: 25, left: '5%', width: `${(Math.max(currentStepIndex, 0) / (statusSteps.length - 1)) * 90}%`, height: 3, backgroundColor: '#15803d', zIndex: 1, transition: 'width 0.5s ease' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                {statusSteps.map((step, index) => {
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  return (
                    <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: isCurrent ? '#facc15' : isCompleted ? '#15803d' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12, border: isCurrent ? '3px solid #166534' : 'none' }}>
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      <span style={{ fontSize: 10, textAlign: 'center', marginTop: 6, fontWeight: isCurrent || isCompleted ? 'bold' : 'normal', color: isCurrent ? '#166534' : isCompleted ? '#15803d' : '#94a3b8', maxWidth: 65 }}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status + Track */}
            <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 'bold' }}>
                {order.status || 'Order Received'}
              </span>
              <button
                onClick={() => navigate(`/track-order?id=${order._id}`)}
                style={{ backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}
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