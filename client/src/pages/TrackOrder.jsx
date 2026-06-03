import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

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

    // Ping the backend server every 3 seconds to check if payment status has changed
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/orders/${orderId}`);
        if (response.ok) {
          const data = await response.json();
          setOrder(data);
          setError(null);
          
          // Stop checking if the order is successfully paid or fully delivered
          if (data.status !== 'Pending') {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Tracking connection error:", err);
        setError("Unable to reach synchronization server.");
      } finally {
        setLoading(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId]);

  if (!orderId) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h3>No Order Token Found</h3>
        <p>Head back to the storefront to fill your cart basket.</p>
        <Link to="/" style={{ color: '#15803d', fontWeight: 'bold' }}>Go to Storefront</Link>
      </div>
    );
  }

  if (loading && !order) {
    return <div style={{ padding: '50px', textAlign: 'center', fontWeight: 'bold', fontFamily: 'sans-serif' }}>🔄 Fetching live dispatch metrics...</div>;
  }

  const stages = ['Pending', 'Paid', 'Processing', 'Out for Delivery', 'Delivered'];
  const currentStageIndex = order ? stages.indexOf(order.status) : 0;

  return (
    <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', color: '#334155' }}>
      <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Order Identifier</span>
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px' }}>#{orderId}</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Payment Status</span>
            <strong style={{ 
              backgroundColor: order?.status === 'Pending' ? '#fef3c7' : '#dcfce7', 
              color: order?.status === 'Pending' ? '#d97706' : '#15803d', 
              padding: '4px 10px', borderRadius: '20px', fontSize: '13px' 
            }}>
              {order?.status === 'Pending' ? '⏳ Verifying M-Pesa...' : `✅ ${order?.status}`}
            </strong>
          </div>
        </div>

        {/* 📋 LIVE MPESA VERIFICATION LOOKUP STATUS */}
        {order?.status === 'Pending' && (
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '15px', borderRadius: '8px', marginBottom: '25px', fontSize: '14px' }}>
            <strong>Waiting for PIN entry...</strong> An STK pop-up menu has been dispatched to phone number <strong>{order.phone}</strong>. Enter your Safaricom PIN to release the KSh {order.totalAmount} transit funds. This dashboard will update instantly upon clearance.
          </div>
        )}

        {/* 🗺️ VISUAL PROGRESS TRACKING PIPELINE */}
        <h3 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '15px' }}>📦 Dispatch Pipeline Progress</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '40px', padding: '0 10px' }}>
          
          <div style={{ position: 'absolute', top: '15px', left: 0, right: 0, height: '4px', backgroundColor: '#e2e8f0', zIndex: 1 }}></div>
          <div style={{ position: 'absolute', top: '15px', left: 0, width: `${(currentStageIndex / (stages.length - 1)) * 100}%`, height: '4px', backgroundColor: '#15803d', zIndex: 2, transition: 'width 0.5s ease' }}></div>

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
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px',
                  boxShadow: isCurrent ? '0 0 0 4px #dcfce7' : 'none'
                }}>
                  {idx + 1}
                </div>
                <span style={{ fontSize: '11px', marginTop: '8px', fontWeight: isCompleted ? 'bold' : 'normal', color: isCompleted ? '#1e293b' : '#94a3b8' }}>{stage}</span>
              </div>
            );
          })}
        </div>

        {/* ORDERED INVENTORY BILLING SUMMARY */}
        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Consignee Profile Summary</h4>
          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Client Name:</strong> {order?.customerName}</p>
          <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>📍 Drop-off Point:</strong> {order?.location}</p>
          {order?.mpesaReceiptNumber && <p style={{ margin: '4px 0', fontSize: '14px', color: '#15803d' }}><strong>Receipt Code:</strong> {order.mpesaReceiptNumber}</p>}
          
          <h4 style={{ margin: '18px 0 8px 0', color: '#1e293b', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>Manifest Items</h4>
          {order?.items.map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0' }}>
              <span>{item.name} <strong>(x{item.quantity})</strong></span>
              <strong>KSh {item.price * item.quantity}</strong>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', marginTop: '12px', paddingTop: '12px', fontWeight: 'bold' }}>
            <span>Total Transacted</span>
            <span style={{ color: '#15803d', fontSize: '16px' }}>KSh {order?.totalAmount}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TrackOrder;