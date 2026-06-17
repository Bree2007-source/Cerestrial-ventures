import React, { useState, useEffect, useRef } from 'react';
import API_BASE_URL from '../config';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');
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
  const fileInputRef = useRef();

  const [formData, setFormData] = useState({
    name: '', category: '', retailPrice: '', wholesalePrice: '',
    countInStock: '', description: '', brand: '', image: ''
  });
  const [promotionSubject, setPromotionSubject] = useState('');
  const [promotionMessage, setPromotionMessage] = useState('');
  const [sendingPromotion, setSendingPromotion] = useState(false);
  const [promotionResult, setPromotionResult] = useState('');

  // ── Category list is built dynamically from existing products ──
  // This keeps it in sync with the Shop page filters automatically.
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('cv-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: { ...getAuthHeaders() },
      });
      if (res.ok) {
        setOrders(await res.json());
      } else {
        const text = await res.text();
        setError(`Failed to fetch orders: ${res.status} ${text}`);
      }
    } catch { setError('Cannot connect to backend.'); }
    finally { setLoading(false); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/analytics`, {
        headers: { ...getAuthHeaders() },
      });
      if (res.ok) setAnalytics(await res.json());
    } catch { console.warn('Unable to load analytics'); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        headers: { ...getAuthHeaders() },
      });
      if (res.ok) setProducts(await res.json());
    } catch { console.error('Cannot load products'); }
  };

  useEffect(() => { fetchOrders(); fetchProducts(); fetchAnalytics(); }, []);

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
      if (imageFile) {
        imageUrl = await uploadImage();
        if (!imageUrl) { setSubmitting(false); return; }
      }
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
      else { const data = await res.json(); alert('❌ Error: ' + (data.message || 'Unable to delete product.')); }
    } catch { alert('Connection error.'); }
  };

  const startEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '', category: product.category || '',
      retailPrice: product.retailPrice || '', wholesalePrice: product.wholesalePrice || '',
      countInStock: product.countInStock || '', description: product.description || '',
      brand: product.brand || '', image: product.image || ''
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
    finally { setSendingPromotion(false); window.setTimeout(() => setPromotionResult(''), 5000); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchOrders();
      else { const data = await res.json(); alert('❌ Error updating status: ' + (data.message || 'Try again.')); }
    } catch { alert('Connection error.'); }
  };

  const totalRevenue = orders
    .filter(o => o.status !== 'Pending')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const lowStock = products.filter(p => p.countInStock <= 5);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'sans-serif' }}>🔄 Loading admin dashboard...</div>;

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', color: '#334155' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #166534, #15803d)', color: 'white', padding: '25px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', boxShadow: '0 4px 15px rgba(21,128,61,0.3)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px' }}>🛡️ Cerestrial Ventures Admin Panel</h2>
          <p style={{ margin: '5px 0 0', opacity: 0.85, fontSize: '13px' }}>Inventory, orders, analytics and fulfillment controls</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Sales', value: `KSh ${analytics?.totalRevenue?.toLocaleString() || totalRevenue.toLocaleString()}` },
            { label: 'Products', value: products.length },
            { label: 'Orders', value: analytics?.totalOrders || orders.length },
          ].map(stat => (
            <div key={stat.label} style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '12px 18px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '10px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px' }}>{stat.value}</div>
            </div>
          ))}
          {lowStock.length > 0 && (
            <div style={{ backgroundColor: '#dc2626', padding: '12px 18px', borderRadius: '8px', textAlign: 'center', border: '1px solid #f87171' }}>
              <div style={{ fontSize: '10px', opacity: 0.9, textTransform: 'uppercase' }}>⚠️ Low Stock</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{lowStock.length}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        {[
          { key: 'orders', label: `🚚 Orders (${orders.length})` },
          { key: 'inventory', label: `📦 Inventory (${products.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '11px 22px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s', backgroundColor: activeTab === tab.key ? '#166534' : 'white', color: activeTab === tab.key ? 'white' : '#334155', border: activeTab === tab.key ? 'none' : '1px solid #cbd5e1', boxShadow: activeTab === tab.key ? '0 2px 8px rgba(22,101,52,0.3)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>{error}</div>}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['ID / Customer', 'Items', 'Total', '📍 Delivery Location', 'Status'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No orders yet.</td></tr>
              ) : orders.map(order => (
                <tr key={order._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <strong style={{ color: '#15803d', fontSize: '13px' }}>#{order._id.slice(-6).toUpperCase()}</strong>
                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{order.customerName}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{order.phone}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                    {order.items?.map((item, i) => (
                      <div key={i} style={{ marginBottom: '2px' }}>
                        {item.name} <span style={{ color: '#94a3b8' }}>×{item.quantity}</span>
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#15803d' }}>
                    KSh {order.totalAmount?.toLocaleString()}
                  </td>

                  {/* ── Delivery Location Column ── */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                      {order.location || <span style={{ color: '#94a3b8' }}>No address</span>}
                    </div>
                    {order.latitude && order.longitude ? (
                      <>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                          {order.latitude.toFixed(5)}, {order.longitude.toFixed(5)}
                        </div>
                        <button
                          onClick={() => window.open(`https://www.google.com/maps?q=${order.latitude},${order.longitude}`, '_blank')}
                          style={{ padding: '6px 12px', backgroundColor: '#1d4ed8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          🗺️ Open Location
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#f59e0b' }}>⚠️ No pin saved</span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <select value={order.status}
                      onChange={e => handleStatusChange(order._id, e.target.value)}
                      style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', backgroundColor: order.status === 'Pending' ? '#fef3c7' : order.status === 'Delivered' ? '#dcfce7' : order.status === 'Paid' ? '#dbeafe' : '#f1f5f9', color: order.status === 'Pending' ? '#b45309' : order.status === 'Delivered' ? '#15803d' : order.status === 'Paid' ? '#1d4ed8' : '#334155' }}>
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
            <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
              <strong style={{ color: '#b45309' }}>⚠️ Low Stock Alert: </strong>
              <span style={{ color: '#92400e' }}>{lowStock.map(p => `${p.name} (${p.countInStock} left)`).join(' · ')}</span>
            </div>
          )}

          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>📣 Promotion Broadcast</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Send a promotions message to users with promotions enabled.</div>
              </div>
              <button onClick={() => { setPromotionSubject(''); setPromotionMessage(''); setPromotionResult(''); }}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', cursor: 'pointer', fontWeight: 'bold' }}>
                Reset
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>Subject</label>
              <input value={promotionSubject} onChange={e => setPromotionSubject(e.target.value)} style={inp} placeholder="e.g. 20% off today" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>Message</label>
              <textarea value={promotionMessage} onChange={e => setPromotionMessage(e.target.value)} style={{ ...inp, minHeight: '120px', resize: 'vertical' }} placeholder="Type the promotion message here..." />
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button onClick={handleSendPromotion} disabled={sendingPromotion}
                style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#15803d', color: 'white', cursor: sendingPromotion ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {sendingPromotion ? 'Sending…' : 'Send Promotion'}
              </button>
              {promotionResult && (
                <span style={{ color: promotionResult.startsWith('Error') ? '#dc2626' : '#15803d', fontSize: '13px' }}>{promotionResult}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#1e293b' }}>📦 Product Catalog</h3>
            <button onClick={() => { resetForm(); setShowAddForm(!showAddForm); }}
              style={{ padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', borderRadius: '8px', border: 'none', backgroundColor: showAddForm ? '#dc2626' : '#15803d', color: 'white' }}>
              {showAddForm ? '✕ Cancel' : '+ Add New Product'}
            </button>
          </div>

          {showAddForm && (
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '25px', marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 20px', fontSize: '16px', color: '#1e293b' }}>
                {editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}
              </h4>
              <form onSubmit={handleProductSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={lbl}>Product Name *</label>
                    <input required value={formData.name} style={inp} placeholder="e.g., Mumias Sugar 2kg" onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={lbl}>Category *</label>
                    <select required value={formData.category} style={inp} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="">-- Select --</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      {formData.category && !categories.includes(formData.category) && (
                        <option value={formData.category}>{formData.category}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Brand</label>
                    <input value={formData.brand} style={inp} placeholder="e.g., Mumias" onChange={e => setFormData({...formData, brand: e.target.value})} />
                  </div>
                  <div>
                    <label style={lbl}>Retail Price (KSh) *</label>
                    <input required type="number" min="0" value={formData.retailPrice} style={inp} placeholder="e.g., 230" onChange={e => setFormData({...formData, retailPrice: e.target.value})} />
                  </div>
                  <div>
                    <label style={lbl}>Wholesale Price (KSh) *</label>
                    <input required type="number" min="0" value={formData.wholesalePrice} style={inp} placeholder="e.g., 210" onChange={e => setFormData({...formData, wholesalePrice: e.target.value})} />
                  </div>
                  <div>
                    <label style={lbl}>Stock Quantity *</label>
                    <input required type="number" min="0" value={formData.countInStock} style={inp} placeholder="e.g., 50" onChange={e => setFormData({...formData, countInStock: e.target.value})} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Product Image</label>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div onClick={() => fileInputRef.current.click()}
                        style={{ width: '120px', height: '120px', borderRadius: '10px', border: '2px dashed #cbd5e1', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', flexShrink: 0 }}
                        onMouseOver={e => e.currentTarget.style.borderColor = '#15803d'}
                        onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                        {imagePreview
                          ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: '32px' }}>📷</div><div style={{ fontSize: '11px', marginTop: '5px' }}>Click to upload</div></div>}
                      </div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                        <button type="button" onClick={() => fileInputRef.current.click()}
                          style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', display: 'block' }}>
                          📁 Choose Image File
                        </button>
                        {imageFile && <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '8px' }}>✅ {imageFile.name} ({(imageFile.size / 1024).toFixed(0)}KB)</div>}
                        <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '8px' }}>Or paste an image URL:</div>
                        <input value={formData.image} style={{...inp, fontSize: '12px'}} placeholder="https://images.unsplash.com/..."
                          onChange={e => { setFormData({...formData, image: e.target.value}); setImagePreview(e.target.value); setImageFile(null); }} />
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Supported: JPG, PNG, WebP · Max 5MB</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Description</label>
                    <textarea value={formData.description} rows="2" style={{...inp, resize: 'vertical'}} placeholder="Short product description..." onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" disabled={submitting || uploadingImage}
                    style={{ padding: '12px 30px', backgroundColor: submitting ? '#86efac' : '#15803d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '15px' }}>
                    {uploadingImage ? '📤 Uploading image...' : submitting ? '💾 Saving...' : editingProduct ? '💾 Save Changes' : '➕ Add Product'}
                  </button>
                  <button type="button" onClick={resetForm}
                    style={{ padding: '12px 20px', backgroundColor: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Product', 'Category', 'Retail', 'Wholesale', 'Stock', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '13px 15px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No products yet. Click "+ Add New Product" to get started!</td></tr>
                ) : products.map(p => (
                  <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: p.countInStock <= 5 ? '#fffbeb' : 'white' }}>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {p.image
                          ? <img src={p.image} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, border: '1px solid #e2e8f0' }} />
                          : <div style={{ width: '48px', height: '48px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📦</div>}
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.name}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{p.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>{p.category}</span>
                    </td>
                    <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#15803d' }}>KSh {p.retailPrice?.toLocaleString()}</td>
                    <td style={{ padding: '12px 15px', color: '#64748b' }}>KSh {p.wholesalePrice?.toLocaleString()}</td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold', backgroundColor: p.countInStock <= 5 ? '#fee2e2' : p.countInStock <= 15 ? '#fef3c7' : '#dcfce7', color: p.countInStock <= 5 ? '#dc2626' : p.countInStock <= 15 ? '#b45309' : '#15803d' }}>
                        {p.countInStock <= 5 ? '⚠️ ' : ''}{p.countInStock} units
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => startEdit(p)} style={{ padding: '6px 14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>✏️ Edit</button>
                        <button onClick={() => handleDelete(p._id, p.name)} style={{ padding: '6px 14px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>🗑️ Delete</button>
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

const inp = {
  width: '100%', padding: '10px', borderRadius: '6px',
  border: '1px solid #cbd5e1', boxSizing: 'border-box',
  fontSize: '14px', backgroundColor: 'white', fontFamily: 'sans-serif'
};

const lbl = {
  display: 'block', fontSize: '12px', fontWeight: '600',
  marginBottom: '5px', color: '#475569'
};

export default AdminDashboard;