import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

const fmt = (n) => `KSh ${Number(n || 0).toLocaleString()}`;

const inp = {
  width: '100%', padding: '10px', borderRadius: '6px',
  border: '1px solid #cbd5e1', boxSizing: 'border-box',
  fontSize: '14px', backgroundColor: 'white', fontFamily: 'sans-serif',
};
const lbl = {
  display: 'block', fontSize: '12px', fontWeight: '600',
  marginBottom: '5px', color: '#475569',
};

const StatCard = ({ label, value, sub, accent, icon }) => (
  <div style={{
    background: 'white', borderRadius: '10px',
    border: '1px solid #e2e8f0', padding: '16px 18px',
    position: 'relative', overflow: 'hidden', minWidth: 0,
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: accent }} />
    <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 26, opacity: 0.1 }}>{icon}</div>
    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
  </div>
);

const SimpleBarChart = ({ data, labels, color, formatter }) => {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, padding: '10px 0' }}>
      {data.map((val, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 9, color: '#94a3b8' }}>{formatter ? formatter(val) : val}</div>
          <div style={{ width: '100%', backgroundColor: color, borderRadius: '4px 4px 0 0', height: `${(val / max) * 140}px`, minHeight: val > 0 ? 4 : 0, transition: 'height 0.3s' }} />
          <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>{labels[i]}</div>
        </div>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '', category: '', retailPrice: '', wholesalePrice: '',
    countInStock: '', description: '', brand: '', image: '',
  });
  const [promotionSubject, setPromotionSubject] = useState('');
  const [promotionMessage, setPromotionMessage] = useState('');
  const [sendingPromotion, setSendingPromotion] = useState(false);
  const [promotionResult, setPromotionResult] = useState('');

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('cv-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, { headers: { ...getAuthHeaders() } });
      if (res.ok) setOrders(await res.json());
      else setError(`Failed to fetch orders: ${res.status}`);
    } catch { setError('Cannot connect to backend.'); }
    finally { setLoading(false); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/analytics`, { headers: { ...getAuthHeaders() } });
      if (res.ok) setAnalytics(await res.json());
    } catch { console.warn('Unable to load analytics'); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products`, { headers: { ...getAuthHeaders() } });
      if (res.ok) setProducts(await res.json());
    } catch { console.error('Cannot load products'); }
  };

  useEffect(() => { fetchOrders(); fetchProducts(); fetchAnalytics(); }, []);

  const totalRevenue = analytics?.totalRevenue ??
    orders.filter(o => o.status !== 'Pending').reduce((s, o) => s + (o.totalAmount || 0), 0);

  const pendingOrders   = orders.filter(o => o.status === 'Pending').length;
  const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
  const lowStock        = products.filter(p => p.countInStock <= 5);

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activeCustomers = new Set(
    orders
      .filter(o => new Date(o.createdAt).getTime() > thirtyDaysAgo)
      .map(o => o.phone || o.customerName)
  ).size;

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { label: d.toLocaleString('en-KE', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() };
  });

  const ordersByMonth = months.map(m =>
    orders.filter(o => {
      const d = new Date(o.createdAt);
      return d.getMonth() === m.month && d.getFullYear() === m.year;
    }).length
  );

  const revenueByMonth = months.map(m =>
    orders
      .filter(o => {
        const d = new Date(o.createdAt);
        return d.getMonth() === m.month && d.getFullYear() === m.year && o.status !== 'Cancelled';
      })
      .reduce((s, o) => s + (o.totalAmount || 0), 0)
  );

  const chartLabels = months.map(m => m.label);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image too large! Please use an image under 5MB.'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!imageFile) return formData.image;
    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append('image', imageFile);
      const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: data });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      return result.url;
    } catch (err) {
      alert('Image upload failed: ' + err.message);
      return null;
    } finally { setUploadingImage(false); }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = formData.image;
      if (imageFile) { imageUrl = await uploadImage(); if (!imageUrl) { setSubmitting(false); return; } }
      const url = editingProduct
        ? `${API_BASE_URL}/products/${editingProduct._id}`
        : `${API_BASE_URL}/products`;
      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          ...formData, image: imageUrl,
          retailPrice: Number(formData.retailPrice),
          wholesalePrice: Number(formData.wholesalePrice),
          countInStock: Number(formData.countInStock),
        }),
      });
      const data = await res.json();
      if (res.ok) { alert(editingProduct ? '✅ Product updated!' : '✅ Product added!'); resetForm(); fetchProducts(); }
      else alert('❌ Error: ' + data.message);
    } catch (err) { alert('Server error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
      if (res.ok) { alert('🗑️ Deleted!'); fetchProducts(); }
      else { const data = await res.json(); alert('❌ Error: ' + (data.message || 'Unable to delete.')); }
    } catch { alert('Connection error.'); }
  };

  const startEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '', category: product.category || '',
      retailPrice: product.retailPrice || '', wholesalePrice: product.wholesalePrice || '',
      countInStock: product.countInStock || '', description: product.description || '',
      brand: product.brand || '', image: product.image || '',
    });
    setImagePreview(product.image || '');
    setImageFile(null);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setShowAddForm(false); setEditingProduct(null);
    setImageFile(null); setImagePreview('');
    setFormData({ name: '', category: '', retailPrice: '', wholesalePrice: '', countInStock: '', description: '', brand: '', image: '' });
  };

  const handleSendPromotion = async () => {
    if (!promotionSubject.trim() || !promotionMessage.trim()) { alert('Please enter both subject and message.'); return; }
    setSendingPromotion(true);
    setPromotionResult('Sending promotion...');
    try {
      const res = await fetch(`${API_BASE_URL}/products/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ subject: promotionSubject, message: promotionMessage }),
      });
      const data = await res.json();
      if (res.ok) { setPromotionResult(`Promotion sent to ${data.recipients} users.`); setPromotionSubject(''); setPromotionMessage(''); }
      else setPromotionResult(`Error: ${data.message || 'Unable to send promotion.'}`);
    } catch { setPromotionResult('Network error while sending promotion.'); }
    finally { setSendingPromotion(false); setTimeout(() => setPromotionResult(''), 5000); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchOrders();
      else { const data = await res.json(); alert('❌ Error: ' + (data.message || 'Try again.')); }
    } catch { alert('Connection error.'); }
  };

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif' }}>🔄 Loading admin dashboard...</div>
  );

  const tabs = [
    { key: 'overview',  label: '📊 Overview' },
    { key: 'orders',    label: `🚚 Orders (${orders.length})` },
    { key: 'inventory', label: `📦 Inventory (${products.length})` },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', fontFamily: 'sans-serif', color: '#334155' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #166534, #15803d)', color: 'white', padding: '22px 26px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24, boxShadow: '0 4px 15px rgba(21,128,61,0.3)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>🛡️ Cerestrial Ventures Admin Panel</h2>
          <p style={{ margin: '5px 0 0', opacity: 0.85, fontSize: 13 }}>Inventory, orders, analytics and fulfillment controls</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Sales', value: fmt(totalRevenue) },
            { label: 'Products',    value: products.length },
            { label: 'Orders',      value: analytics?.totalOrders || orders.length },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '10px 16px', borderRadius: 8, textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
          {lowStock.length > 0 && (
            <div style={{ backgroundColor: '#dc2626', padding: '10px 16px', borderRadius: 8, textAlign: 'center', border: '1px solid #f87171' }}>
              <div style={{ fontSize: 10, opacity: 0.9, textTransform: 'uppercase' }}>⚠️ Low Stock</div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>{lowStock.length}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 14, transition: 'all 0.2s', backgroundColor: activeTab === tab.key ? '#166534' : 'white', color: activeTab === tab.key ? 'white' : '#334155', border: activeTab === tab.key ? 'none' : '1px solid #cbd5e1', boxShadow: activeTab === tab.key ? '0 2px 8px rgba(22,101,52,0.3)' : 'none' }}>
            {tab.label}
          </button>
        ))}
        <button onClick={() => navigate('/admin/orders')} style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 14, backgroundColor: '#1d4ed8', color: 'white', border: 'none', marginLeft: 'auto' }}>
          🔍 Full Orders Management →
        </button>
      </div>

      {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard label="Total Orders"     value={orders.length}          sub="All time"                      accent="#16a34a" icon="🛒" />
            <StatCard label="Revenue"          value={fmt(totalRevenue)}      sub="Excl. pending & cancelled"     accent="#16a34a" icon="💰" />
            <StatCard label="Pending Orders"   value={pendingOrders}          sub="Awaiting fulfilment"           accent="#f59e0b" icon="⏳" />
            <StatCard label="Delivered"        value={deliveredOrders}        sub={`${orders.length ? Math.round(deliveredOrders / orders.length * 100) : 0}% fulfilment rate`} accent="#16a34a" icon="✅" />
            <StatCard label="Low Stock"        value={lowStock.length}        sub="Products ≤ 5 units"            accent="#ef4444" icon="⚠️" />
            <StatCard label="Active Customers" value={activeCustomers}        sub="Ordered in last 30 days"       accent="#3b82f6" icon="👥" />
          </div>

          {lowStock.length > 0 && (
            <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 16px', marginBottom: 20 }}>
              <strong style={{ color: '#b45309' }}>⚠️ Low Stock Alert: </strong>
              <span style={{ color: '#92400e' }}>{lowStock.map(p => `${p.name} (${p.countInStock} left)`).join(' · ')}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Monthly Orders</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>Last 6 months</div>
              <SimpleBarChart data={ordersByMonth} labels={chartLabels} color="#16a34a" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11, color: '#64748b' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#16a34a' }} /> Orders
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Revenue Trend</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>Last 6 months (KSh)</div>
              <SimpleBarChart data={revenueByMonth} labels={chartLabels} color="#3b82f6" formatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#3b82f6' }} /> Revenue
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['ID / Customer', 'Items', 'Total', '📍 Delivery Location', 'Status'].map(h => (
                  <th key={h} style={{ padding: '13px 15px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No orders yet.</td></tr>
              ) : orders.map(order => (
                <tr key={order._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '13px 15px' }}>
                    <strong style={{ color: '#15803d', fontSize: 13 }}>#{order._id.slice(-6).toUpperCase()}</strong>
                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{order.customerName}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{order.phone}</div>
                  </td>
                  <td style={{ padding: '13px 15px', fontSize: 13 }}>
                    {order.items?.map((item, i) => (
                      <div key={i} style={{ marginBottom: 2 }}>{item.name} <span style={{ color: '#94a3b8' }}>×{item.quantity}</span></div>
                    ))}
                  </td>
                  <td style={{ padding: '13px 15px', fontWeight: 'bold', color: '#15803d' }}>{fmt(order.totalAmount)}</td>
                  <td style={{ padding: '13px 15px' }}>
                    <div style={{ fontSize: 13, color: '#334155', marginBottom: 4 }}>
                      {order.location || <span style={{ color: '#94a3b8' }}>No address</span>}
                    </div>
                    {order.latitude && order.longitude ? (
                      <>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{order.latitude.toFixed(5)}, {order.longitude.toFixed(5)}</div>
                        <button onClick={() => window.open(`https://www.google.com/maps?q=${order.latitude},${order.longitude}`, '_blank')} style={{ padding: '5px 11px', backgroundColor: '#1d4ed8', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>🗺️ Open Location</button>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: '#f59e0b' }}>⚠️ No pin saved</span>
                    )}
                  </td>
                  <td style={{ padding: '13px 15px' }}>
                    <select value={order.status} onChange={e => handleStatusChange(order._id, e.target.value)}
                      style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontWeight: 'bold', cursor: 'pointer', fontSize: 13, backgroundColor: order.status === 'Pending' ? '#fef3c7' : order.status === 'Delivered' ? '#dcfce7' : order.status === 'Paid' ? '#dbeafe' : '#f1f5f9', color: order.status === 'Pending' ? '#b45309' : order.status === 'Delivered' ? '#15803d' : order.status === 'Paid' ? '#1d4ed8' : '#334155' }}>
                      <option value="Pending">⏳ Pending</option>
                      <option value="Order Received">📬 Order Received</option>
                      <option value="Payment Confirmed">✅ Payment Confirmed</option>
                      <option value="Paid">💰 Paid</option>
                      <option value="Processing Order">⚙️ Processing</option>
                      <option value="Packed">📦 Packed</option>
                      <option value="Out for Delivery">🚚 Out for Delivery</option>
                      <option value="Delivered">🏁 Delivered</option>
                      <option value="Cancelled">❌ Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <>
          {lowStock.length > 0 && (
            <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
              <strong style={{ color: '#b45309' }}>⚠️ Low Stock Alert: </strong>
              <span style={{ color: '#92400e' }}>{lowStock.map(p => `${p.name} (${p.countInStock} left)`).join(' · ')}</span>
            </div>
          )}

          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>📣 Promotion Broadcast</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Send a promotion message to users with promotions enabled.</div>
              </div>
              <button onClick={() => { setPromotionSubject(''); setPromotionMessage(''); setPromotionResult(''); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', cursor: 'pointer', fontWeight: 'bold' }}>Reset</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Subject</label>
              <input value={promotionSubject} onChange={e => setPromotionSubject(e.target.value)} style={inp} placeholder="e.g. 20% off today" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Message</label>
              <textarea value={promotionMessage} onChange={e => setPromotionMessage(e.target.value)} style={{ ...inp, minHeight: 120, resize: 'vertical' }} placeholder="Type the promotion message here..." />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={handleSendPromotion} disabled={sendingPromotion} style={{ padding: '12px 24px', borderRadius: 8, border: 'none', backgroundColor: '#15803d', color: 'white', cursor: sendingPromotion ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {sendingPromotion ? 'Sending…' : 'Send Promotion'}
              </button>
              {promotionResult && <span style={{ color: promotionResult.startsWith('Error') ? '#dc2626' : '#15803d', fontSize: 13 }}>{promotionResult}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: '#1e293b' }}>📦 Product Catalog</h3>
            <button onClick={() => { resetForm(); setShowAddForm(!showAddForm); }} style={{ padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', fontSize: 14, borderRadius: 8, border: 'none', backgroundColor: showAddForm ? '#dc2626' : '#15803d', color: 'white' }}>
              {showAddForm ? '✕ Cancel' : '+ Add New Product'}
            </button>
          </div>

          {showAddForm && (
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 25, marginBottom: 25 }}>
              <h4 style={{ margin: '0 0 20px', fontSize: 16, color: '#1e293b' }}>{editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}</h4>
              <form onSubmit={handleProductSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={lbl}>Product Name *</label>
                    <input required value={formData.name} style={inp} placeholder="e.g., Mumias Sugar 2kg" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Category *</label>
                    <select required value={formData.category} style={inp} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      <option value="">-- Select --</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      {formData.category && !categories.includes(formData.category) && <option value={formData.category}>{formData.category}</option>}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Brand</label>
                    <input value={formData.brand} style={inp} placeholder="e.g., Mumias" onChange={e => setFormData({ ...formData, brand: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Retail Price (KSh) *</label>
                    <input required type="number" min="0" value={formData.retailPrice} style={inp} placeholder="e.g., 230" onChange={e => setFormData({ ...formData, retailPrice: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Wholesale Price (KSh) *</label>
                    <input required type="number" min="0" value={formData.wholesalePrice} style={inp} placeholder="e.g., 210" onChange={e => setFormData({ ...formData, wholesalePrice: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Stock Quantity *</label>
                    <input required type="number" min="0" value={formData.countInStock} style={inp} placeholder="e.g., 50" onChange={e => setFormData({ ...formData, countInStock: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Product Image</label>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        style={{ width: 120, height: 120, borderRadius: 10, border: '2px dashed #cbd5e1', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', flexShrink: 0 }}
                        onMouseOver={e => e.currentTarget.style.borderColor = '#15803d'}
                        onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                      >
                        {imagePreview ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: 32 }}>📷</div><div style={{ fontSize: 11, marginTop: 5 }}>Click to upload</div></div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                        <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 14, marginBottom: 10, display: 'block' }}>📁 Choose Image File</button>
                        {imageFile && <div style={{ fontSize: 12, color: '#15803d', marginBottom: 8 }}>✅ {imageFile.name} ({(imageFile.size / 1024).toFixed(0)}KB)</div>}
                        <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>Or paste an image URL:</div>
                        <input value={formData.image} style={{ ...inp, fontSize: 12 }} placeholder="https://res.cloudinary.com/..." onChange={e => { setFormData({ ...formData, image: e.target.value }); setImagePreview(e.target.value); setImageFile(null); }} />
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Supported: JPG, PNG, WebP · Max 5MB</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Description</label>
                    <textarea value={formData.description} rows="2" style={{ ...inp, resize: 'vertical' }} placeholder="Short product description..." onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="submit" disabled={submitting || uploadingImage} style={{ padding: '12px 30px', backgroundColor: submitting ? '#86efac' : '#15803d', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 15 }}>
                    {uploadingImage ? '📤 Uploading image...' : submitting ? '💾 Saving...' : editingProduct ? '💾 Save Changes' : '➕ Add Product'}
                  </button>
                  <button type="button" onClick={resetForm} style={{ padding: '12px 20px', backgroundColor: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Product', 'Category', 'Retail', 'Wholesale', 'Stock', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '13px 15px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No products yet.</td></tr>
                ) : products.map(p => (
                  <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: p.countInStock <= 5 ? '#fffbeb' : 'white' }}>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {p.image ? <img src={p.image} alt={p.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid #e2e8f0' }} /> : <div style={{ width: 48, height: 48, backgroundColor: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📦</div>}
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{p.category}</span>
                    </td>
                    <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#15803d' }}>{fmt(p.retailPrice)}</td>
                    <td style={{ padding: '12px 15px', color: '#64748b' }}>{fmt(p.wholesalePrice)}</td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 'bold', backgroundColor: p.countInStock <= 5 ? '#fee2e2' : p.countInStock <= 15 ? '#fef3c7' : '#dcfce7', color: p.countInStock <= 5 ? '#dc2626' : p.countInStock <= 15 ? '#b45309' : '#15803d' }}>
                        {p.countInStock <= 5 ? '⚠️ ' : ''}{p.countInStock} units
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => startEdit(p)} style={{ padding: '6px 14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>✏️ Edit</button>
                        <button onClick={() => handleDelete(p._id, p.name)} style={{ padding: '6px 14px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>🗑️ Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;