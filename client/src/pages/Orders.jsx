import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import socket from '../socket';

const GREEN = '#15803d';

const statusSteps = [
  'Pending', 'Assigned to Driver', 'Driver On The Way', 'Arrived', 'Delivered'
];

const statusColors = {
  'Pending':            { bg: '#fef9c3', color: '#854d0e' },
  'Assigned to Driver': { bg: '#dbeafe', color: '#1e40af' },
  'Driver On The Way':  { bg: '#ffedd5', color: '#9a3412' },
  'Arrived':            { bg: '#ede9fe', color: '#5b21b6' },
  'Delivered':          { bg: '#dcfce7', color: '#166534' },
  'Cancelled':          { bg: '#fee2e2', color: '#991b1b' },
};

const ALL_STATUSES = ['All', 'Pending', 'Assigned to Driver', 'Driver On The Way', 'Arrived', 'Delivered', 'Cancelled'];

export default function Orders() {
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [receipt, setReceipt]           = useState(null);
  const [reordering, setReordering]     = useState(null);
  const [liveUpdate, setLiveUpdate]     = useState(null);
  const receiptRef                      = useRef();
  const navigate                        = useNavigate();

  // ── Fetch orders on mount ─────────────────────────────────────────
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('cv-token') || localStorage.getItem('token');
        if (!token) {
          setError('Please log in to view orders.');
          setLoading(false);
          return;
        }
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

  // ── Real-time Socket.io updates ───────────────────────────────────
  // This runs whenever orders change — joins each order's room
  // so we receive live status updates from the backend
  useEffect(() => {
    if (orders.length === 0) return;

    // Join a socket room for each order
    orders.forEach(order => {
      socket.emit('join_order', order._id);
    });

    // Listen for status changes from the server
    const handleStatusChange = ({ orderId, status, driverName }) => {
      // Update the specific order in our list
      setOrders(prev =>
        prev.map(order =>
          order._id === orderId
            ? { ...order, status, driverName: driverName || order.driverName }
            : order
        )
      );

      // Show a live update notification banner
      setLiveUpdate({ orderId, status });
      setTimeout(() => setLiveUpdate(null), 4000);
    };

    socket.on('order_status_changed', handleStatusChange);

    // Cleanup — remove listener when component unmounts
    return () => {
      socket.off('order_status_changed', handleStatusChange);
    };
  }, [orders.length]);

  // ── Filter orders ─────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === 'All' || o.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q
      || o._id.toLowerCase().includes(q)
      || o.items?.some(i => i.name?.toLowerCase().includes(q))
      || (o.location || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ── Reorder handler ───────────────────────────────────────────────
  const handleReorder = async (order) => {
    setReordering(order._id);
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      order.items.forEach(item => {
        const existing = cart.find(c => c._id === item.productId || c.name === item.name);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          cart.push({
            _id: item.productId || item._id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image || '',
          });
        }
      });
      localStorage.setItem('cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdated'));
      navigate('/cart');
    } catch {
      alert('Failed to reorder. Please try again.');
    } finally {
      setReordering(null);
    }
  };

  // ── PDF download ──────────────────────────────────────────────────
  const handleDownloadPDF = async (orderId) => {
    try {
      const token = localStorage.getItem('cv-token') || localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to download');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${orderId.slice(-6).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not download receipt. Please try again.');
    }
  };

  // ── Print receipt ─────────────────────────────────────────────────
  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h2 { color: #15803d; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        th { background: #f1f5f9; }
        .total { font-weight: bold; font-size: 16px; }
      </style></head>
      <body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
      <p style={{ color: '#64748b' }}>Loading your orders...</p>
    </div>
  );

  // ── Error state ───────────────────────────────────────────────────
  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>
      <button onClick={() => navigate('/login')}
        style={{ padding: '10px 24px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
        Go to Login
      </button>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────
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
        .progress-wrapper { overflow-x: auto; padding-bottom: 8px; -webkit-overflow-scrolling: touch; }
        .progress-track { position: relative; padding: 10px 0 0; min-width: 480px; }
        .progress-line-bg { position: absolute; top: 25px; left: 4%; right: 4%; height: 3px; background: #e2e8f0; z-index: 1; }
        .progress-line-fill { position: absolute; top: 25px; left: 4%; height: 3px; background: #15803d; z-index: 1; transition: width 0.5s ease; }
        .progress-steps { display: flex; justify-content: space-between; position: relative; z-index: 2; }
        .progress-step { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .progress-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; color: white; flex-shrink: 0; }
        .progress-label { font-size: 9px; text-align: center; margin-top: 5px; max-width: 60px; line-height: 1.3; }
        .order-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
        .action-btn { border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-size: 12px; font-weight: 700; transition: opacity .2s; }
        .action-btn:hover { opacity: 0.85; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal-box { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
        .receipt-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
        .receipt-table th, .receipt-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        .receipt-table th { background: #f8fafc; font-weight: 700; color: #475569; }
        .live-banner { position: fixed; top: 70px; left: 50%; transform: translateX(-50%); background: #166534; color: white; padding: 10px 20px; border-radius: 30px; font-size: 13px; font-weight: 700; z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,0.2); animation: slideDown 0.3s ease; }
        @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        input[type=text]::placeholder { color: #94a3b8; }
        @media (max-width: 480px) {
          .order-header-label { font-size: 10px; }
          .order-header-value { font-size: 12px; }
          .order-items { font-size: 12px; }
          .action-btn { font-size: 11px; padding: 7px 10px; }
        }
      `}</style>

      {/* Live update notification banner */}
      {liveUpdate && (
        <div className="live-banner">
          🔔 Order #{liveUpdate.orderId.slice(-6).toUpperCase()} → {liveUpdate.status}
        </div>
      )}

      {/* Header */}
      <h2 style={{ color: '#1e293b', borderBottom: `2px solid ${GREEN}`, paddingBottom: 10, marginBottom: 20, fontSize: 'clamp(18px, 4vw, 24px)' }}>
        📦 My Orders
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 400, marginLeft: 10 }}>
          ({orders.length} order{orders.length !== 1 ? 's' : ''})
        </span>
        {/* Live indicator */}
        <span style={{ marginLeft: 10, fontSize: 11, backgroundColor: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>
          🟢 Live
        </span>
      </h2>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 Search by order ID, item, or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8,
            border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = GREEN}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0',
            fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer',
          }}
        >
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Empty state */}
      {!filtered.length && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
          <p style={{ color: '#64748b', marginBottom: 16 }}>
            {orders.length === 0 ? 'You have no orders yet.' : 'No orders match your search.'}
          </p>
          {orders.length === 0 && (
            <button onClick={() => navigate('/')}
              style={{ padding: '10px 24px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
              Start Shopping
            </button>
          )}
        </div>
      )}

      {/* Orders list */}
      {filtered.map((order) => {
        const currentStepIndex = statusSteps.indexOf(order.status);
        const fillPercent = (Math.max(currentStepIndex, 0) / (statusSteps.length - 1)) * 92;
        const statusStyle = statusColors[order.status] || { bg: '#dbeafe', color: '#1e40af' };
        const isCancelled = order.status === 'Cancelled';

        return (
          <div key={order._id} className="order-card"
            style={{ borderLeft: liveUpdate?.orderId === order._id ? '4px solid #15803d' : '1px solid #e2e8f0' }}>

            {/* Header grid */}
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
                <span className="order-header-value">KSh {(order.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Location */}
            <div className="order-location">
              <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 3 }}>📍 Delivery Location</div>
              <div style={{ fontSize: 13, color: '#334155' }}>{order.location || 'Not specified'}</div>
              {order.coordinates?.lat && order.coordinates?.lng && (
                <button
                  onClick={() => window.open(`https://www.google.com/maps?q=${order.coordinates.lat},${order.coordinates.lng}`, '_blank')}
                  style={{ marginTop: 5, background: 'none', border: 'none', padding: 0, color: '#1d4ed8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                  🗺️ View on Google Maps
                </button>
              )}
              {order.driverName && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#166534' }}>
                  🚴 <strong>Driver:</strong> {order.driverName}
                  {order.driver?.phone && (
                    <span style={{ color: '#64748b' }}> · {order.driver.phone}</span>
                  )}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="order-items">
              🛒 {order.items?.map(i => `${i.name} ×${i.quantity}`).join(' · ') || 'No items'}
            </div>

            {/* Progress bar */}
            {!isCancelled && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                  Delivery Progress
                </div>
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
                              backgroundColor: isCurrent ? '#facc15' : isCompleted ? GREEN : '#cbd5e1',
                              border: isCurrent ? '3px solid #166634' : 'none',
                            }}>
                              {isCompleted ? '✓' : index + 1}
                            </div>
                            <span className="progress-label" style={{
                              fontWeight: isCurrent || isCompleted ? 700 : 400,
                              color: isCurrent ? '#166534' : isCompleted ? GREEN : '#94a3b8',
                            }}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="order-footer">
              <span style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.color,
                padding: '5px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700
              }}>
                {order.status || 'Pending'}
              </span>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="action-btn"
                  onClick={() => setReceipt(order)}
                  style={{ background: '#f1f5f9', color: '#334155' }}>
                  🧾 Receipt
                </button>

                <button className="action-btn"
                  onClick={() => handleDownloadPDF(order._id)}
                  style={{ background: '#ede9fe', color: '#5b21b6' }}>
                  ⬇️ PDF
                </button>

                <button className="action-btn"
                  onClick={() => handleReorder(order)}
                  disabled={reordering === order._id}
                  style={{ background: '#dcfce7', color: '#166534', opacity: reordering === order._id ? 0.6 : 1 }}>
                  {reordering === order._id ? '...' : '🔁 Reorder'}
                </button>

                {!isCancelled && (
                  <button className="action-btn"
                    onClick={() => navigate(`/track-order?id=${order._id}`)}
                    style={{ background: GREEN, color: 'white' }}>
                    🗺️ Track
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Receipt Modal */}
      {receipt && (
        <div className="modal-overlay" onClick={() => setReceipt(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div ref={receiptRef}>

              {/* Receipt header */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 4 }}>🌾</div>
                <h2 style={{ margin: 0, color: GREEN, fontSize: 20 }}>Cerestrial Ventures</h2>
                <p style={{ margin: '4px 0', color: '#64748b', fontSize: 12 }}>Official Receipt</p>
                {receipt.receiptNumber && (
                  <p style={{ margin: '2px 0', color: '#94a3b8', fontSize: 11 }}>
                    Receipt No: {receipt.receiptNumber}
                  </p>
                )}
              </div>

              {/* Order info grid */}
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                  <div><span style={{ color: '#64748b' }}>Order ID:</span> <strong>#{receipt._id.slice(-6).toUpperCase()}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Date:</span> <strong>{new Date(receipt.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Time:</span> <strong>{new Date(receipt.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ color: statusColors[receipt.status]?.color || GREEN }}>{receipt.status}</strong></div>
                  <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#64748b' }}>Customer:</span> <strong>{receipt.customerName}</strong></div>
                  <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#64748b' }}>Phone:</span> <strong>{receipt.phone}</strong></div>
                  {receipt.email && (
                    <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#64748b' }}>Email:</span> <strong>{receipt.email}</strong></div>
                  )}
                  <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#64748b' }}>Delivery:</span> <strong>{receipt.location}</strong></div>
                  {receipt.driverName && (
                    <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#64748b' }}>Driver:</span> <strong>{receipt.driverName}</strong></div>
                  )}
                  <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#64748b' }}>Payment:</span> <strong>{receipt.paymentMethod}</strong></div>
                  {receipt.mpesaCode && (
                    <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#64748b' }}>M-Pesa Ref:</span> <strong>{receipt.mpesaCode}</strong></div>
                  )}
                </div>
              </div>

              {/* Items table */}
              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items?.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>KSh {(item.price || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>KSh {((item.price || 0) * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 12, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#475569' }}>
                  <span>Subtotal</span>
                  <span>KSh {(receipt.items?.reduce((s, i) => s + (i.price || 0) * i.quantity, 0) || 0).toLocaleString()}</span>
                </div>
                {receipt.deliveryFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#475569' }}>
                    <span>Delivery Fee</span>
                    <span>KSh {receipt.deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                {receipt.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#166534' }}>
                    <span>Discount</span>
                    <span>-KSh {receipt.discount.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, color: GREEN, marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                  <span>Grand Total</span>
                  <span>KSh {(receipt.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <span style={{
                    backgroundColor: receipt.paymentStatus === 'Paid' ? '#dcfce7' : '#fef9c3',
                    color: receipt.paymentStatus === 'Paid' ? '#166534' : '#854d0e',
                    padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, letterSpacing: 1
                  }}>
                    {(receipt.paymentStatus || 'PENDING').toUpperCase()}
                  </span>
                </div>
              </div>

              <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 20 }}>
                Thank you for shopping with Cerestrial Ventures!
              </p>
            </div>

            {/* Modal buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <button onClick={handlePrint}
                style={{ flex: 1, padding: 11, background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                🖨️ Print
              </button>
              <button onClick={() => handleDownloadPDF(receipt._id)}
                style={{ flex: 1, padding: 11, background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                ⬇️ Download PDF
              </button>
              <button onClick={() => setReceipt(null)}
                style={{ flex: 1, padding: 11, background: GREEN, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                ✓ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}