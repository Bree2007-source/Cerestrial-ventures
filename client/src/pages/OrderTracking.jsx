import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import API_BASE_URL, { API_HOST } from '../config';

const socket = io(API_HOST);

const statusSteps = [
  'Order Received',
  'Payment Confirmed',
  'Processing Order',
  'Packed',
  'Out for Delivery',
  'Delivered'
];

const OrderTracking = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Fetch real orders for this customer (by phone or auth token)
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('cv-token') || localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/orders/my`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        setOrders(data);

        // 2. Join a socket room for each order
        data.forEach(order => {
          socket.emit('join_order', order._id.toString());
        });
      } catch (err) {
        setError('Could not load orders.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // 3. Listen for live status updates
    socket.on('order_status_update', ({ orderId, status }) => {
      setOrders(prev =>
        prev.map(order =>
          order._id === orderId ? { ...order, status } : order
        )
      );
    });

    return () => {
      socket.off('order_status_update');
    };
  }, []);

  if (loading) return <div style={{ padding: 30 }}>Loading your orders...</div>;
  if (error) return <div style={{ padding: 30, color: 'red' }}>{error}</div>;
  if (orders.length === 0) return <div style={{ padding: 30 }}>No orders found.</div>;

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#1e293b', borderBottom: '2px solid #15803d', paddingBottom: '10px' }}>
        📦 Your Order History & Live Tracking
      </h2>

      {orders.map((order) => {
        const currentStepIndex = statusSteps.indexOf(order.status);

        return (
          <div key={order._id} style={{
            border: '1px solid #e2e8f0', borderRadius: '8px',
            padding: '20px', marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            {/* Order Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '10px', marginBottom: '20px',
              backgroundColor: '#f8fafc', padding: '15px', borderRadius: '6px'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Order ID:</span>
                <strong style={{ color: '#15803d', display: 'block', fontSize: '18px' }}>
                  {order._id}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Date Placed:</span>
                <strong style={{ color: '#334155', display: 'block' }}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Total Amount:</span>
                <strong style={{ color: '#15803d', display: 'block' }}>
                  KSh {order.totalAmount}
                </strong>
              </div>
            </div>

            {/* Delivery Location */}
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#334155' }}>
              📍 <strong>Delivery Location:</strong> {order.location}
            </div>

            {/* Items */}
            <div style={{
              marginBottom: '25px', fontSize: '14px', color: '#475569',
              backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '4px'
            }}>
              📋 <strong>Items:</strong>{' '}
              {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
            </div>

            {/* Live Progress Tracker */}
            <h4 style={{ color: '#475569', marginBottom: '15px' }}>Live Delivery Progress:</h4>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', position: 'relative', padding: '10px 0'
            }}>
              {/* Connecting line behind circles */}
              <div style={{
                position: 'absolute', top: '25px', left: '5%', right: '5%',
                height: '3px', backgroundColor: '#e2e8f0', zIndex: 1
              }} />
              <div style={{
                position: 'absolute', top: '25px', left: '5%',
                width: `${(currentStepIndex / (statusSteps.length - 1)) * 90}%`,
                height: '3px', backgroundColor: '#15803d',
                zIndex: 1, transition: 'width 0.5s ease'
              }} />

              {statusSteps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step} style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', flex: 1, position: 'relative', zIndex: 2
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      backgroundColor: isCurrent ? '#facc15' : isCompleted ? '#15803d' : '#cbd5e1',
                      color: isCompleted || isCurrent ? 'white' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold', fontSize: '12px',
                      border: isCurrent ? '3px solid #166534' : 'none',
                      transition: 'all 0.4s ease'
                    }}>
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <span style={{
                      fontSize: '11px', textAlign: 'center', marginTop: '8px',
                      fontWeight: isCurrent || isCompleted ? 'bold' : 'normal',
                      color: isCurrent ? '#166534' : isCompleted ? '#15803d' : '#64748b',
                      maxWidth: '70px'
                    }}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current status pill */}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <span style={{
                backgroundColor: '#dcfce7', color: '#166534',
                padding: '6px 16px', borderRadius: '20px',
                fontSize: '13px', fontWeight: 'bold'
              }}>
                Current Status: {order.status}
              </span>
            </div>

          </div>
        );
      })}
    </div>
  );
};

export default OrderTracking;