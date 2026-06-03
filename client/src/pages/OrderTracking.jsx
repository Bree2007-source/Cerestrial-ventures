import React, { useState, useEffect } from 'react';

const OrderTracking = () => {
  // Mock order for a customer to see their real-time statuses
  const [orders, setOrders] = useState([
    {
      _id: 'CV-9948',
      createdAt: '2026-05-26',
      total: 2350,
      items: 'Premium Sugar 1kg (x2), Vegetable Cooking Oil 2L (x1), Basmati Rice 5kg (x1)',
      deliveryLocation: 'Nakuru, Section 5, Near Blankets Mill',
      status: 'Processing Order' // This matches your flow!
    }
  ]);

  // List of all possible statuses in your requirement flow
  const statusSteps = [
    'Order Received',
    'Payment Confirmed',
    'Processing Order',
    'Packed',
    'Out for Delivery',
    'Delivered'
  ];

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#1e293b', borderBottom: '2px solid #15803d', paddingBottom: '10px' }}>📦 Your Order History & Live Tracking</h2>
      
      {orders.map((order) => {
        // Find out which step the order is currently on
        const currentStepIndex = statusSteps.indexOf(order.status);

        return (
          <div key={order._id} style={{ backgroundColor: '#white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            
            {/* Order Header Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '6px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Order ID:</span>
                <strong style={{ color: '#15803d', display: 'block', fontSize: '18px' }}>{order._id}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Date Placed:</span>
                <strong style={{ color: '#334155', display: 'block' }}>{order.createdAt}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Total Amount:</span>
                <strong style={{ color: '#15803d', display: 'block' }}>KSh {order.total}</strong>
              </div>
            </div>

            {/* Delivery Destination */}
            <div style={{ marginBottom: '20px', fontSize: '14px', color: '#334155' }}>
              📍 <strong>Delivery Location:</strong> {order.deliveryLocation}
            </div>

            {/* Items Summary */}
            <div style={{ marginBottom: '25px', fontSize: '14px', color: '#475569', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '4px' }}>
              📋 <strong>Items:</strong> {order.items}
            </div>

            {/* REAL-TIME VISUAL TRACKING BAR */}
            <h4 style={{ color: '#475569', marginBottom: '15px' }}>Live Delivery Progress:</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', padding: '10px 0' }}>
              
              {statusSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 2 }}>
                    {/* Status Circle */}
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: isCurrent ? '#facc15' : isCompleted ? '#15803d' : '#cbd5e1',
                      color: isCompleted || isCurrent ? 'white' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      border: isCurrent ? '3px solid #166534' : 'none',
                      transition: 'all 0.3s ease'
                    }}>
                      {isCompleted && !isCurrent ? '✓' : index + 1}
                    </div>
                    
                    {/* Status Label Text */}
                    <span style={{ 
                      fontSize: '11px', 
                      textAlign: 'center', 
                      marginTop: '8px', 
                      fontWeight: isCurrent || isCompleted ? 'bold' : 'normal',
                      color: isCurrent ? '#166534' : isCompleted ? '#15803d' : '#64748b'
                    }}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        );
      })}
    </div>
  );
};

export default OrderTracking;