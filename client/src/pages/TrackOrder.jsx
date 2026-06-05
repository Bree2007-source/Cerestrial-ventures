import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const stages = [
  'Order Received',
  'Payment Confirmed',
  'Processing Order',
  'Packed',
  'Out for Delivery',
  'Delivered'
];

const TrackOrder = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // Fetch order once on load
    const fetchOrder = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/orders/${orderId}`);
        if (response.ok) {
          const data = await response.json();
          setOrder(data);
          setError(null);

          // Join socket room for this order
          socket.emit('join_order', orderId);
        }
      } catch (err) {
        setError('Unable to reach server.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Listen for real-time status updates
    socket.on('order_status_update', ({ orderId: updatedId, status }) => {
      if (updatedId === orderId) {
        setOrder(prev => ({ ...prev, status }));
      }
    });

    return () => {
      socket.off('order_status_update');
    };
  }, [orderId]);

  if (!orderId) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h3>No Order Found</h3>
        <p>Head back to the storefront to fill your cart.</p>
        <Link to="/" style={{ color: '#15803d', fontWeight: 'bold' }}>Go to Storefront</Link>
      </div>
    );
  }

  if (loading && !order) {
    return <div style={{ padding: '50px', textAlign: 'center', fontWeight: 'bold', fontFamily: 'sans-serif' }}>🔄 Loading your order...</div>;
  }

  const currentStageIndex = order ? stages.indexOf(order.status) : 0;

  return (
    <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', color: '#334155' }}>
      <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Order ID</span>
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px' }}>#{orderId}</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Current Status</span>
            <strong style={{
              backgroundColor: order?.status === 'Order Received' ? '#fef3c7' : '#dcfce7',
              color: order?.status === 'Order Received' ? '#d97706' : '#15803d',
              padding: '4px 10px', borderRadius: '20px', fontSize: '13px'
            }}>
              {order?.status === 'Order Received' ? '⏳ Order Received' : `✅ ${order?.status}`}
            </strong>
          </div>
        </div>

        {/* M-Pesa pending notice */}
        {order?.status === 'Order Received' && order?.paymentMethod === 'M-Pesa' && (
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '15px', borderRadius: '8px', marginBottom: '25px', fontSize: '14px' }}>
            <strong>Waiting for M-Pesa confirmation...</strong> An STK push has been sent to <strong>{order.phone}</strong>. Enter your PIN to confirm payment of KSh {order.totalAmount}.
          </div>
        )}

        {/* Progress Tracker */}
        <h3 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '15px' }}>📦 Live Delivery Progress</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '40px', padding: '0 10px' }}>

          {/* Grey background line */}
          <div style={{ position: 'absolute', top: '15px', left: 0, right: 0, height: '4px', backgroundColor: '#e2e8f0', zIndex: 1 }} />
          {/* Green progress line */}
          <div style={{
            position: 'absolute', top: '15px', left: 0,
            width: `${(currentStageIndex / (stages.length - 1)) * 100}%`,
            height: '4px', backgroundColor: '#15803d',
            zIndex: 2, transition: 'width 0.5s ease'
          }} />

          {stages.map((stage, idx) => {
            const isCompleted = idx <= currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage} style={{ zIndex: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: isCompleted ? '#15803d' : 'white',
                  border: isCompleted ? '2px solid #15803d' : '2px solid #cbd5e1',
                  color: isCompleted ? 'white' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '12px',
                  boxShadow: isCurrent ? '0 0 0 4px #dcfce7' : 'none',
                  transition: 'all 0.4s ease'
                }}>
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span style={{
                  fontSize: '11px', marginTop: '8px',
                  fontWeight: isCompleted ? 'bold' : 'normal',
                  color: isCompleted ? '#1e293b' : '#94a3b8',
                  maxWidth: '65px', textAlign: 'center'
                }}>
                  {stage}
                </span>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Order Details</h4>
          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Name:</strong> {order?.customerName}</p>
          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>📍 Delivery Location:</strong> {order?.location}</p>
          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Payment:</strong> {order?.paymentMethod}</p>
          {order?.mpesaReceiptNumber && (
            <p style={{ margin: '4px 0', fontSize: '14px', color: '#15803d' }}>
              <strong>M-Pesa Receipt:</strong> {order.mpesaReceiptNumber}
            </p>
          )}

          <h4 style={{ margin: '18px 0 8px 0', color: '#1e293b', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>Items</h4>
          {order?.items.map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0' }}>
              <span>{item.name} <strong>(x{item.quantity})</strong></span>
              <strong>KSh {item.price * item.quantity}</strong>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', marginTop: '12px', paddingTop: '12px', fontWeight: 'bold' }}>
            <span>Total</span>
            <span style={{ color: '#15803d', fontSize: '16px' }}>KSh {order?.totalAmount}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TrackOrder;