import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

const STATUS_OPTIONS = [
  'Pending', 'Order Received', 'Payment Confirmed', 'Paid',
  'Processing Order', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled',
];

const STATUS_STYLE = {
  'Pending':            { bg: '#fef3c7', color: '#92400e' },
  'Order Received':     { bg: '#dbeafe', color: '#1e3a8a' },
  'Payment Confirmed':  { bg: '#dbeafe', color: '#1e3a8a' },
  'Paid':               { bg: '#dbeafe', color: '#1e3a8a' },
  'Processing Order':   { bg: '#ede9fe', color: '#3b0764' },
  'Packed':             { bg: '#ede9fe', color: '#3b0764' },
  'Out for Delivery':   { bg: '#ffedd5', color: '#9a3412' },
  'Delivered':          { bg: '#dcfce7', color: '#14532d' },
  'Cancelled':          { bg: '#fee2e2', color: '#7f1d1d' },
};

const DRIVER_STATUS_STYLE = {
  'Available':   { bg: '#dcfce7', color: '#14532d' },
  'On Delivery': { bg: '#ffedd5', color: '#9a3412' },
  'Offline':     { bg: '#f1f5f9', color: '#475569' },
};

const ACTIVE_ORDER_STATUSES = ['Assigned to Driver', 'Driver On The Way', 'Arrived'];

const fmt = (n) => `KSh ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || { bg: '#f1f5f9', color: '#334155' };
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, backgroundColor: s.bg, color: s.color }}>
      {status}
    </span>
  );
};

// ── Driver assignment modal ─────────────────────────────────────────────
const AssignDriverModal = ({ order, drivers, orders, onAssign, onClose, assigning }) => {
  const [selectedId, setSelectedId] = useState(order.driver?._id || '');

  const activeCountFor = (driverId) =>
    orders.filter(o => o.driver?._id === driverId && ACTIVE_ORDER_STATUSES.includes(o.status)).length;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: 'white', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'sans-serif' }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>
              {order.driver ? 'Reassign Driver' : 'Assign Driver'}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
              Order #{order._id.slice(-6).toUpperCase()} — {order.customerName}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '12px 20px', flex: 1 }}>
          {drivers.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No drivers found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0' }}>
              {drivers.map(d => {
                const ds = DRIVER_STATUS_STYLE[d.status] || DRIVER_STATUS_STYLE.Offline;
                const isSelected = selectedId === d._id;
                const isCurrent = order.driver?._id === d._id;
                const activeCount = activeCountFor(d._id);
                const isSelectable = d.status === 'Available' || isCurrent;

                return (
                  <label
                    key={d._id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      borderRadius: 8, border: `1.5px solid ${isSelected ? '#15803d' : '#e2e8f0'}`,
                      backgroundColor: isSelected ? '#f0fdf4' : 'white',
                      cursor: isSelectable ? 'pointer' : 'not-allowed',
                      opacity: isSelectable ? 1 : 0.55,
                    }}
                  >
                    <input
                      type="radio"
                      name="driver"
                      value={d._id}
                      checked={isSelected}
                      disabled={!isSelectable}
                      onChange={() => setSelectedId(d._id)}
                      style={{ cursor: isSelectable ? 'pointer' : 'not-allowed' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{d.name}</span>
                        {isCurrent && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', backgroundColor: '#dcfce7', padding: '1px 7px', borderRadius: 999 }}>Currently assigned</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{d.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, backgroundColor: ds.bg, color: ds.color }}>
                        {d.status}
                      </span>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                        {activeCount} active {activeCount === 1 ? 'delivery' : 'deliveries'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#334155', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Cancel
          </button>
          <button
            onClick={() => onAssign(selectedId)}
            disabled={!selectedId || assigning || selectedId === order.driver?._id}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', backgroundColor: '#15803d', color: 'white', cursor: (!selectedId || assigning) ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: (!selectedId || assigning || selectedId === order.driver?._id) ? 0.5 : 1 }}
          >
            {assigning ? 'Assigning…' : order.driver ? 'Reassign' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
};

const OrderManagement = () => {
  const navigate = useNavigate();
  const [orders, setOrders]         = useState([]);
  const [drivers, setDrivers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [modalOrder, setModalOrder] = useState(null);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortCol, setSortCol]       = useState('date');
  const [sortDir, setSortDir]       = useState('desc');
  const [expandedId, setExpandedId] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('cv-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setOrders(await res.json());
    } catch (err) {
      setError('Cannot load orders: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/drivers`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setDrivers(await res.json());
    } catch (err) {
      console.error('Cannot load drivers:', err.message);
    }
  };

  const refreshAll = () => { fetchOrders(); fetchDrivers(); };

  useEffect(() => { refreshAll(); }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      } else {
        const data = await res.json();
        alert('❌ Error: ' + (data.message || 'Try again.'));
      }
    } catch { alert('Connection error.'); }
    finally { setUpdatingId(null); }
  };

  const handleAssignDriver = async (orderId, driverId) => {
    if (!driverId) return;
    setAssigningId(orderId);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/assign-driver`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ driverId }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(prev => prev.map(o => o._id === orderId ? data : o));
        setModalOrder(null);
        fetchDrivers();
      } else {
        alert('❌ Error: ' + (data.message || 'Could not assign driver.'));
      }
    } catch {
      alert('Connection error.');
    } finally {
      setAssigningId(null);
    }
  };

  const handleRemoveDriver = async (orderId) => {
    if (!window.confirm('Remove the assigned driver from this order?')) return;
    setRemovingId(orderId);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/unassign-driver`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(prev => prev.map(o => o._id === orderId ? data : o));
        fetchDrivers();
      } else {
        alert('❌ Error: ' + (data.message || 'Could not remove driver.'));
      }
    } catch {
      alert('Connection error.');
    } finally {
      setRemovingId(null);
    }
  };

  const stats = useMemo(() => ({
    total:     orders.length,
    revenue:   orders.filter(o => !['Pending','Cancelled'].includes(o.status)).reduce((s,o) => s + (o.totalAmount||0), 0),
    pending:   orders.filter(o => o.status === 'Pending').length,
    delivered: orders.filter(o => o.status === 'Delivered').length,
  }), [orders]);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    let rows = orders.filter(o => {
      const matchQ = !q
        || o._id.toLowerCase().includes(q)
        || (o.customerName || '').toLowerCase().includes(q)
        || (o.phone || '').includes(q)
        || (o.location || '').toLowerCase().includes(q);
      const matchS = !filterStatus || o.status === filterStatus;
      return matchQ && matchS;
    });
    rows.sort((a, b) => {
      let va, vb;
      if (sortCol === 'amount')        { va = a.totalAmount||0;                    vb = b.totalAmount||0; }
      else if (sortCol === 'customer') { va = (a.customerName||'').toLowerCase();  vb = (b.customerName||'').toLowerCase(); }
      else if (sortCol === 'status')   { va = a.status||'';                        vb = b.status||''; }
      else                             { va = a.createdAt||'';                     vb = b.createdAt||''; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return rows;
  }, [orders, search, filterStatus, sortCol, sortDir]);

  const visibleRevenue = visible.reduce((s,o) => s + (o.totalAmount||0), 0);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };
  const sortArrow = (col) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  if (loading) return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif', color: '#64748b' }}>🔄 Loading orders...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: 1300, margin: '0 auto', fontFamily: 'sans-serif', color: '#334155' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 6 }}>← Back to Dashboard</button>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>📋 Orders Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Search, filter, sort and update all customer orders</p>
        </div>
        <button onClick={refreshAll} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#334155', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>🔄 Refresh</button>
      </div>

      {/* Stat bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total orders',  value: stats.total,        accent: '#16a34a' },
          { label: 'Total revenue', value: fmt(stats.revenue), accent: '#16a34a' },
          { label: 'Pending',       value: stats.pending,      accent: '#f59e0b' },
          { label: 'Delivered',     value: stats.delivered,    accent: '#3b82f6' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: c.accent }} />
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search by name, phone, order ID, location…" style={{ flex: '1 1 240px', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'sans-serif', color: '#334155' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'sans-serif', color: '#334155', backgroundColor: 'white' }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sortCol} onChange={e => setSortCol(e.target.value)} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'sans-serif', color: '#334155', backgroundColor: 'white' }}>
          <option value="date">Sort: date</option>
          <option value="amount">Sort: amount</option>
          <option value="customer">Sort: customer</option>
          <option value="status">Sort: status</option>
        </select>
        <select value={sortDir} onChange={e => setSortDir(e.target.value)} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'sans-serif', color: '#334155', backgroundColor: 'white' }}>
          <option value="desc">↓ Newest first</option>
          <option value="asc">↑ Oldest first</option>
        </select>
        {(search || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); }} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>✕ Clear</button>
        )}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {[
                  { key: null,       label: 'Order ID' },
                  { key: 'customer', label: 'Customer' },
                  { key: null,       label: 'Delivery info' },
                  { key: null,       label: 'Items' },
                  { key: 'amount',   label: 'Amount' },
                  { key: 'date',     label: 'Date' },
                  { key: 'status',   label: 'Status' },
                  { key: null,       label: 'Update status' },
                  { key: null,       label: 'Assigned Driver' },
                  { key: null,       label: '' },
                ].map((h, i) => (
                  <th key={i} onClick={h.key ? () => toggleSort(h.key) : undefined}
                    style={{ padding: '12px 14px', textAlign: 'left', color: '#475569', fontWeight: 600, cursor: h.key ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    {h.label}{h.key && <span style={{ fontSize: 10, marginLeft: 3, color: '#94a3b8' }}>{sortArrow(h.key)}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan="10" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>{orders.length === 0 ? 'No orders yet.' : 'No orders match your search.'}</td></tr>
              ) : visible.map(order => {
                const isExpanded = expandedId === order._id;
                const isUpdating = updatingId === order._id;
                const isRemoving = removingId === order._id;
                const ss = STATUS_STYLE[order.status] || { bg: '#f1f5f9', color: '#334155' };
                const hasDriver = !!order.driver;
                const canRemove = hasDriver && order.status === 'Assigned to Driver';

                return (
                  <React.Fragment key={order._id}>
                    <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9', backgroundColor: isExpanded ? '#f8fafc' : 'white' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#15803d', fontWeight: 700 }}>#{order._id.slice(-6).toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{order.customerName || '—'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{order.phone || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 14px', maxWidth: 160 }}>
                        <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.4 }}>{order.location || <span style={{ color: '#94a3b8' }}>No address</span>}</div>
                        {order.latitude && order.longitude
                          ? <button onClick={() => window.open(`https://www.google.com/maps?q=${order.latitude},${order.longitude}`, '_blank')} style={{ marginTop: 5, padding: '3px 9px', backgroundColor: '#1d4ed8', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>🗺️ Map</button>
                          : <span style={{ fontSize: 10, color: '#f59e0b' }}>⚠️ No pin</span>}
                      </td>
                      <td style={{ padding: '12px 14px', maxWidth: 180 }}>
                        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                          {order.items?.slice(0, 2).map((item, i) => (
                            <div key={i}>{item.name} <span style={{ color: '#94a3b8' }}>×{item.quantity}</span></div>
                          ))}
                          {order.items?.length > 2 && <div style={{ color: '#94a3b8', fontSize: 11 }}>+{order.items.length - 2} more…</div>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>{fmt(order.totalAmount)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{order.createdAt ? fmtDate(order.createdAt) : '—'}</td>
                      <td style={{ padding: '12px 14px' }}><StatusBadge status={order.status} /></td>
                      <td style={{ padding: '12px 14px' }}>
                        <select value={order.status} disabled={isUpdating} onChange={e => handleStatusChange(order._id, e.target.value)}
                          style={{ padding: '6px 8px', borderRadius: 6, fontSize: 12, border: '1px solid #cbd5e1', cursor: isUpdating ? 'not-allowed' : 'pointer', backgroundColor: ss.bg, color: ss.color, fontWeight: 700, fontFamily: 'sans-serif', opacity: isUpdating ? 0.6 : 1 }}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 14px', minWidth: 170 }}>
                        {hasDriver ? (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{order.driver.name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{order.driver.phone}</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => setModalOrder(order)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                Reassign
                              </button>
                              {canRemove && (
                                <button onClick={() => handleRemoveDriver(order._id)} disabled={isRemoving} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', cursor: isRemoving ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, opacity: isRemoving ? 0.6 : 1 }}>
                                  {isRemoving ? 'Removing…' : 'Remove'}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Not Assigned</span>
                            <button onClick={() => setModalOrder(order)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', backgroundColor: '#15803d', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                              Assign Driver
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setExpandedId(isExpanded ? null : order._id)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', backgroundColor: isExpanded ? '#f1f5f9' : 'white', color: '#334155', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {isExpanded ? '▲ Less' : '▼ More'}
                          </button>
                          <button onClick={() => navigate(`/track-order?id=${order._id}`)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', backgroundColor: '#15803d', color: 'white', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>🗺️ Track</button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                        <td colSpan="10" style={{ padding: '0 14px 16px 14px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>

                            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>All items</div>
                              {order.items?.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155', marginBottom: 4 }}>
                                  <span>{item.name} ×{item.quantity}</span>
                                  <span style={{ color: '#15803d', fontWeight: 700 }}>{fmt((item.price||0) * item.quantity)}</span>
                                </div>
                              ))}
                              <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
                                <span>Total</span><span style={{ color: '#15803d' }}>{fmt(order.totalAmount)}</span>
                              </div>
                            </div>

                            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery details</div>
                              <table style={{ fontSize: 12, width: '100%' }}>
                                <tbody>
                                  {[
                                    ['Customer',    order.customerName || '—'],
                                    ['Phone',       order.phone || '—'],
                                    ['Address',     order.location || 'Not specified'],
                                    ['Coordinates', order.latitude ? `${order.latitude.toFixed(4)}, ${order.longitude.toFixed(4)}` : 'Not saved'],
                                    ['Order date',  order.createdAt ? fmtDate(order.createdAt) : '—'],
                                    ['Payment',     order.paymentMethod || '—'],
                                    ['Driver',      order.driver ? `${order.driver.name} (${order.driver.phone})` : 'Not Assigned'],
                                  ].map(([k,v]) => (
                                    <tr key={k}>
                                      <td style={{ color: '#64748b', paddingBottom: 5, paddingRight: 12, whiteSpace: 'nowrap' }}>{k}</td>
                                      <td style={{ color: '#1e293b', fontWeight: 500, paddingBottom: 5 }}>{v}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {order.latitude && order.longitude && (
                                <button onClick={() => window.open(`https://www.google.com/maps?q=${order.latitude},${order.longitude}`, '_blank')} style={{ marginTop: 8, padding: '7px 14px', backgroundColor: '#1d4ed8', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🗺️ Open in Google Maps</button>
                              )}
                            </div>

                            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick status update</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {STATUS_OPTIONS.filter(s => s !== order.status).slice(0, 5).map(s => {
                                  const sc = STATUS_STYLE[s] || { bg: '#f1f5f9', color: '#334155' };
                                  return (
                                    <button key={s} onClick={() => handleStatusChange(order._id, s)} disabled={isUpdating}
                                      style={{ padding: '7px 12px', borderRadius: 6, border: `1px solid ${sc.bg}`, backgroundColor: sc.bg, color: sc.color, cursor: 'pointer', fontSize: 12, fontWeight: 700, textAlign: 'left' }}>
                                      → {s}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 12, color: '#64748b', backgroundColor: '#f8fafc' }}>
          <span>Showing <strong style={{ color: '#1e293b' }}>{visible.length}</strong> of {orders.length} orders</span>
          <span>Filtered subtotal: <strong style={{ color: '#15803d' }}>{fmt(visibleRevenue)}</strong></span>
        </div>
      </div>

      {modalOrder && (
        <AssignDriverModal
          order={modalOrder}
          drivers={drivers}
          orders={orders}
          assigning={assigningId === modalOrder._id}
          onAssign={(driverId) => handleAssignDriver(modalOrder._id, driverId)}
          onClose={() => setModalOrder(null)}
        />
      )}
    </div>
  );
};

export default OrderManagement;