/**
 * Cerestrial Ventures — Admin Dashboard
 *
 * Features:
 *  - Overview with real KPIs + charts
 *  - Orders management with full status workflow + search/filter + driver assignment
 *  - Bulk driver assignment (checkboxes + "Assign Selected Orders")
 *  - Inventory with add/edit/delete + low-stock alerts
 *  - Product Sales Summary (daily/weekly/monthly/custom)
 *  - Customers list
 *  - Drivers tab (AdminDrivers.jsx)
 *  - Promotions broadcast
 *  - Real-time polling (upgradeable to WebSocket)
 *  - Fully responsive — mobile first, no horizontal scroll
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import socket from '../socket';
import AdminDrivers from './AdminDrivers';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt    = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtNum = (n) => Number(n || 0).toLocaleString('en-KE');
const pct    = (a, b) => (b ? Math.round((a / b) * 100) : 0);

const STATUS_META = {
  'Pending':            { color: '#f59e0b', bg: '#fef3c7', label: 'Pending' },
  'Order Received':     { color: '#3b82f6', bg: '#dbeafe', label: 'Received' },
  'Payment Confirmed':  { color: '#8b5cf6', bg: '#ede9fe', label: 'Paid ✓' },
  'Paid':               { color: '#8b5cf6', bg: '#ede9fe', label: 'Paid' },
  'Processing Order':   { color: '#f97316', bg: '#ffedd5', label: 'Processing' },
  'Packed':             { color: '#0891b2', bg: '#cffafe', label: 'Packed' },
  'Out for Delivery':   { color: '#1d4ed8', bg: '#dbeafe', label: 'On the Way' },
  'Delivered':          { color: '#16a34a', bg: '#dcfce7', label: 'Delivered' },
  'Cancelled':          { color: '#dc2626', bg: '#fee2e2', label: 'Cancelled' },
};

const ALL_STATUSES = Object.keys(STATUS_META);

const getStatusStyle = (status) => {
  const m = STATUS_META[status] || { color: '#64748b', bg: '#f1f5f9', label: status };
  return { backgroundColor: m.bg, color: m.color, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' };
};

// An order can be bulk-selected only if it has no driver yet and isn't finished.
const isBulkSelectable = (o) => !o.driver && o.status !== 'Cancelled' && o.status !== 'Delivered';

const getToken  = ()      => localStorage.getItem('cv-token') || '';
const authHdr   = ()      => ({ Authorization: `Bearer ${getToken()}` });
const jsonHdr   = ()      => ({ 'Content-Type': 'application/json', ...authHdr() });

const today     = ()      => new Date().toISOString().split('T')[0];
const nDaysAgo  = (n)     => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Stat card with coloured left bar */
const KPICard = ({ label, value, sub, color, icon, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
      padding: '16px 18px', position: 'relative', overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow .15s',
      minWidth: 0,
    }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: color, borderRadius: '12px 0 0 12px' }} />
    <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 28, opacity: 0.08 }}>{icon}</div>
    <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
  </div>
);

/** Mini inline bar chart — pure CSS, no lib */
const BarChart = ({ data = [], labels = [], color, formatter }) => {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, paddingBottom: 24, position: 'relative' }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.2 }}>
            {formatter ? formatter(v) : fmtNum(v)}
          </span>
          <div style={{
            width: '100%', background: color, borderRadius: '3px 3px 0 0',
            height: `${Math.round((v / max) * 120)}px`, minHeight: v > 0 ? 3 : 0,
            transition: 'height .4s ease',
          }} />
          <span style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', position: 'absolute', bottom: 0 }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};

/** Status badge pill */
const Badge = ({ status }) => <span style={getStatusStyle(status)}>{STATUS_META[status]?.label || status}</span>;

/** Small spinner */
const Spinner = ({ size = 20 }) => (
  <div style={{
    width: size, height: size, border: `2px solid #e2e8f0`,
    borderTop: `2px solid #166534`, borderRadius: '50%',
    animation: 'spin .7s linear infinite', display: 'inline-block',
  }} />
);

/** Toast notification */
const Toast = ({ msg, type = 'success', onClose }) => {
  const bg = type === 'error' ? '#fee2e2' : type === 'warning' ? '#fef3c7' : '#dcfce7';
  const cl = type === 'error' ? '#991b1b' : type === 'warning' ? '#92400e' : '#166534';
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: bg, color: cl, border: `1px solid ${cl}33`, borderRadius: 10, padding: '14px 20px', minWidth: 260, maxWidth: 360, boxShadow: '0 8px 24px rgba(0,0,0,.12)', display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14 }}>
      <span style={{ flexShrink: 0 }}>{type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅'}</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cl, fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
    </div>
  );
};

// Input / label style helpers
const iStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box',
  outline: 'none', fontFamily: 'inherit', color: '#1e293b', background: 'white',
};
const lStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 };

// ─── Driver assignment helpers ─────────────────────────────────────────────────
const DRIVER_STATUS_STYLE = {
  'Available':   { bg: '#dcfce7', color: '#14532d' },
  'On Delivery': { bg: '#ffedd5', color: '#9a3412' },
  'Offline':     { bg: '#f1f5f9', color: '#475569' },
};

/** Assign / reassign driver modal — opens from the Orders tab */
const AssignDriverModal = ({ order, drivers, onAssign, onClose, assigning }) => {
  const [selectedId, setSelectedId] = useState(order.driver?._id || '');

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 460, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>{order.driver ? 'Reassign Driver' : 'Assign Driver'}</h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>Order #{order._id.slice(-6).toUpperCase()} — {order.customerName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '12px 20px', flex: 1 }}>
          {drivers.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No drivers found. Add one in the Drivers tab.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0' }}>
              {drivers.map(d => {
                const ds = DRIVER_STATUS_STYLE[d.status] || DRIVER_STATUS_STYLE.Offline;
                const isSelected   = selectedId === d._id;
                const isCurrent    = order.driver?._id === d._id;
                const isSelectable = (d.status === 'Available' && d.isActive) || isCurrent;
                return (
                  <label key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${isSelected ? '#166534' : '#e2e8f0'}`, background: isSelected ? '#f0fdf4' : 'white', cursor: isSelectable ? 'pointer' : 'not-allowed', opacity: isSelectable ? 1 : .55 }}>
                    <input type="radio" name="driver" value={d._id} checked={isSelected} disabled={!isSelectable} onChange={() => setSelectedId(d._id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{d.name}</span>
                        {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '1px 7px', borderRadius: 999 }}>Currently assigned</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{d.phone}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: ds.bg, color: ds.color, whiteSpace: 'nowrap' }}>{d.status}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#334155', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button
            onClick={() => onAssign(selectedId)}
            disabled={!selectedId || assigning || selectedId === order.driver?._id}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#166534', color: 'white', cursor: (!selectedId || assigning) ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: (!selectedId || assigning || selectedId === order.driver?._id) ? .5 : 1 }}
          >
            {assigning ? 'Assigning…' : order.driver ? 'Reassign' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Bulk-assign modal — pick one driver for N selected orders at once */
const BulkAssignModal = ({ count, drivers, onAssign, onClose, assigning }) => {
  const [selectedId, setSelectedId] = useState('');

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 460, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>Assign driver to {count} order{count === 1 ? '' : 's'}</h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>This driver's delivery queue will be recalculated automatically.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '12px 20px', flex: 1 }}>
          {drivers.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No drivers found. Add one in the Drivers tab.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0' }}>
              {drivers.map(d => {
                const ds = DRIVER_STATUS_STYLE[d.status] || DRIVER_STATUS_STYLE.Offline;
                const isSelected   = selectedId === d._id;
                const isSelectable = d.isActive && d.status !== 'Offline';
                return (
                  <label key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${isSelected ? '#166534' : '#e2e8f0'}`, background: isSelected ? '#f0fdf4' : 'white', cursor: isSelectable ? 'pointer' : 'not-allowed', opacity: isSelectable ? 1 : .55 }}>
                    <input type="radio" name="bulk-driver" value={d._id} checked={isSelected} disabled={!isSelectable} onChange={() => setSelectedId(d._id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {d.phone}{d.status === 'On Delivery' ? ' · queue will be extended' : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: ds.bg, color: ds.color, whiteSpace: 'nowrap' }}>{d.status}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#334155', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button
            onClick={() => onAssign(selectedId)}
            disabled={!selectedId || assigning}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#166534', color: 'white', cursor: (!selectedId || assigning) ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: (!selectedId || assigning) ? .5 : 1 }}
          >
            {assigning ? 'Assigning…' : `Assign ${count} order${count === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab]         = useState('overview');
  const [orders, setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);

  // Driver assignment
  const [drivers, setDrivers]         = useState([]);
  const [modalOrder, setModalOrder]   = useState(null);
  const [assigningId, setAssigningId] = useState(null);

  // Bulk driver assignment
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [showBulkModal, setShowBulkModal]       = useState(false);
  const [bulkAssigning, setBulkAssigning]       = useState(false);

  // Orders tab state
  const [orderSearch, setOrderSearch]   = useState('');
  const [orderStatus, setOrderStatus]   = useState('');
  const [orderDate, setOrderDate]       = useState('');
  const [orderPage, setOrderPage]       = useState(1);
  const ORDER_PAGE_SIZE = 20;

  // Sales summary state
  const [salesRange, setSalesRange]     = useState('today');
  const [salesFrom, setSalesFrom]       = useState(today());
  const [salesTo, setSalesTo]           = useState(today());
  const [salesData, setSalesData]       = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);

  // Inventory / product form state
  const [showForm, setShowForm]         = useState(false);
  const [editProduct, setEditProduct]   = useState(null);
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [invSearch, setInvSearch]       = useState('');
  const [invCat, setInvCat]             = useState('');
  const [invStock, setInvStock]         = useState('');
  const fileRef = useRef(null);

  const emptyForm = { name: '', category: '', retailPrice: '', wholesalePrice: '', countInStock: '', description: '', brand: '', image: '', minWholesaleQuantity: '10' };
  const [form, setForm] = useState(emptyForm);

  // Promotions state
  const [promoSubject, setPromoSubject] = useState('');
  const [promoBody, setPromoBody]       = useState('');
  const [promoSending, setPromoSending] = useState(false);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/orders`, { headers: authHdr() });
      if (r.ok) setOrders(await r.json());
    } catch { /* silent — handled by loading state */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/products`, { headers: authHdr() });
      if (r.ok) setProducts(await r.json());
    } catch {}
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/admin/analytics`, { headers: authHdr() });
      if (r.ok) setAnalytics(await r.json());
    } catch {}
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/admin/customers`, { headers: authHdr() });
      if (r.ok) setCustomers(await r.json());
    } catch {}
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/drivers`, { headers: authHdr() });
      if (r.ok) setDrivers(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchProducts(), fetchAnalytics(), fetchCustomers(), fetchDrivers()])
      .finally(() => setLoading(false));

    const refreshDashboard = () => {
      fetchOrders();
      fetchProducts();
      fetchAnalytics();
      fetchDrivers();
    };

    socket.on('order_updated', refreshDashboard);
    socket.on('driver_status_changed', refreshDashboard);

    // Poll every 30 s for real-time feel (replace with WebSocket when ready)
    const poll = setInterval(() => { refreshDashboard(); }, 30000);
    return () => {
      socket.off('order_updated', refreshDashboard);
      socket.off('driver_status_changed', refreshDashboard);
      clearInterval(poll);
    };
  }, [fetchOrders, fetchProducts, fetchAnalytics, fetchCustomers, fetchDrivers]);

  // ── Sales summary ──────────────────────────────────────────────────────────
  const computeSalesRange = useCallback(() => {
    if (salesRange === 'today')   return { from: today(),        to: today() };
    if (salesRange === 'week')    return { from: nDaysAgo(6),    to: today() };
    if (salesRange === 'month')   return { from: nDaysAgo(29),   to: today() };
    return { from: salesFrom, to: salesTo };
  }, [salesRange, salesFrom, salesTo]);

  const buildSalesSummary = useCallback(() => {
    setSalesLoading(true);
    const { from, to } = computeSalesRange();
    const fromMs = new Date(from).setHours(0, 0, 0, 0);
    const toMs   = new Date(to).setHours(23, 59, 59, 999);

    const filtered = orders.filter(o => {
      const t = new Date(o.createdAt).getTime();
      return t >= fromMs && t <= toMs && o.status !== 'Cancelled';
    });

    // Aggregate by product name
    const map = {};
    filtered.forEach(o => {
      (o.items || []).forEach(item => {
        const key = item.name || 'Unknown';
        if (!map[key]) map[key] = { name: key, qty: 0, revenue: 0, orders: new Set() };
        map[key].qty     += Number(item.quantity || 1);
        map[key].revenue += Number(item.price || 0) * Number(item.quantity || 1);
        map[key].orders.add(o._id);
      });
    });

    const rows = Object.values(map)
      .map(r => ({ ...r, orderCount: r.orders.size }))
      .sort((a, b) => b.revenue - a.revenue);

    setSalesData(rows);
    setSalesLoading(false);
  }, [orders, computeSalesRange]);

  useEffect(() => {
    if (tab === 'sales') buildSalesSummary();
  }, [tab, salesRange, salesFrom, salesTo, orders, buildSalesSummary]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalRevenue    = analytics?.totalRevenue ?? orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0);
  const todayOrders     = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const pendingCount    = orders.filter(o => o.status === 'Pending' || o.status === 'Order Received').length;
  const deliveredCount  = orders.filter(o => o.status === 'Delivered').length;
  const lowStock        = products.filter(p => (p.countInStock || 0) <= 5);
  const outOfStock      = products.filter(p => (p.countInStock || 0) === 0);
  const todayRevenue    = todayOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0);

  // Last 6 months chart data
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { label: d.toLocaleString('en-KE', { month: 'short' }), y: d.getFullYear(), m: d.getMonth() };
  });
  const ordersByMonth  = months.map(({ y, m }) => orders.filter(o => { const d = new Date(o.createdAt); return d.getMonth() === m && d.getFullYear() === y; }).length);
  const revenueByMonth = months.map(({ y, m }) => orders.filter(o => { const d = new Date(o.createdAt); return d.getMonth() === m && d.getFullYear() === y && o.status !== 'Cancelled'; }).reduce((s, o) => s + (o.totalAmount || 0), 0));
  const chartLabels    = months.map(m => m.label);

  // Top products by items ordered — TODAY only
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const productSales = {};
  orders
    .filter(o =>
      (o.status === 'Delivered' || o.status === 'Paid') &&
      new Date(o.createdAt) >= todayMidnight
    )
    .forEach(o => {
      (o.items || []).forEach(item => {
        if (!productSales[item.name]) productSales[item.name] = 0;
        productSales[item.name] += item.quantity || 1;
      });
    });
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const todayLabel  = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' });

  // ── Orders filtering ───────────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const q = orderSearch.toLowerCase();
    const matchSearch = !q || o.customerName?.toLowerCase().includes(q) || o.phone?.includes(q) || o._id?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q);
    const matchStatus = !orderStatus || o.status === orderStatus;
    const matchDate   = !orderDate   || new Date(o.createdAt).toDateString() === new Date(orderDate).toDateString();
    return matchSearch && matchStatus && matchDate;
  });
  const paginatedOrders = filteredOrders.slice((orderPage - 1) * ORDER_PAGE_SIZE, orderPage * ORDER_PAGE_SIZE);
  const totalPages      = Math.ceil(filteredOrders.length / ORDER_PAGE_SIZE);
  const pageEligibleIds       = paginatedOrders.filter(isBulkSelectable).map(o => o._id);
  const eligibleFilteredCount = filteredOrders.filter(isBulkSelectable).length;

  // ── Inventory filtering ────────────────────────────────────────────────────
  const categories     = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  const filteredProds  = products.filter(p => {
    const q = invSearch.toLowerCase();
    const matchQ   = !q || p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q);
    const matchCat = !invCat  || p.category === invCat;
    const matchStk = !invStock || (invStock === 'low' && p.countInStock <= 5 && p.countInStock > 0) || (invStock === 'out' && p.countInStock === 0) || (invStock === 'ok' && p.countInStock > 5);
    return matchQ && matchCat && matchStk;
  });

  // ── Order status update ────────────────────────────────────────────────────
  const updateOrderStatus = async (id, status) => {
    try {
      const r = await fetch(`${API_BASE_URL}/orders/${id}/status`, { method: 'PATCH', headers: jsonHdr(), body: JSON.stringify({ status }) });
      if (r.ok) { await fetchOrders(); showToast(`Status updated to "${status}"`); }
      else showToast('Failed to update status', 'error');
    } catch { showToast('Network error', 'error'); }
  };

  // ── Driver assignment ──────────────────────────────────────────────────────
  const handleAssignDriver = async (orderId, driverId) => {
    if (!driverId) return;
    setAssigningId(orderId);
    try {
      const r = await fetch(`${API_BASE_URL}/orders/${orderId}/assign-driver`, {
        method: 'PATCH', headers: jsonHdr(), body: JSON.stringify({ driverId }),
      });
      const d = await r.json();
      if (r.ok) {
        await fetchOrders();
        await fetchDrivers();
        setModalOrder(null);
        showToast('Driver assigned');
      } else showToast(d.message || 'Could not assign driver', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setAssigningId(null); }
  };

  const handleRemoveDriver = async (orderId) => {
    if (!window.confirm('Remove the assigned driver from this order?')) return;
    try {
      const r = await fetch(`${API_BASE_URL}/orders/${orderId}/unassign-driver`, { method: 'PATCH', headers: jsonHdr() });
      const d = await r.json();
      if (r.ok) { await fetchOrders(); await fetchDrivers(); showToast('Driver removed'); }
      else showToast(d.message || 'Could not remove driver', 'error');
    } catch { showToast('Network error', 'error'); }
  };

  // ── Bulk driver assignment ─────────────────────────────────────────────────
  const toggleSelectOrder = (id) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      const allSelected = pageEligibleIds.length > 0 && pageEligibleIds.every(id => next.has(id));
      pageEligibleIds.forEach(id => { if (allSelected) next.delete(id); else next.add(id); });
      return next;
    });
  };

  const selectAllFilteredEligible = () => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      filteredOrders.filter(isBulkSelectable).forEach(o => next.add(o._id));
      return next;
    });
  };

  const clearSelection = () => setSelectedOrderIds(new Set());

  const handleBulkAssign = async (driverId) => {
    if (!driverId || selectedOrderIds.size === 0) return;
    setBulkAssigning(true);
    try {
      const r = await fetch(`${API_BASE_URL}/orders/bulk-assign`, {
        method: 'PATCH', headers: jsonHdr(),
        body: JSON.stringify({ orderIds: Array.from(selectedOrderIds), driverId }),
      });
      const d = await r.json();
      if (r.ok) {
        await fetchOrders();
        await fetchDrivers();
        setShowBulkModal(false);
        clearSelection();
        showToast(`${d.assignedCount} order${d.assignedCount === 1 ? '' : 's'} assigned to ${d.driver?.name || 'driver'}${d.skipped?.length ? ` (${d.skipped.length} skipped)` : ''}`);
      } else showToast(d.message || 'Bulk assignment failed', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setBulkAssigning(false); }
  };

  // ── Product CRUD ───────────────────────────────────────────────────────────
  const uploadImage = async () => {
    if (!imageFile) return form.image;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', imageFile);
      const r = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', headers: authHdr(), body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      return d.url;
    } catch (e) { showToast('Image upload failed: ' + e.message, 'error'); return null; }
    finally { setUploading(false); }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = form.image;
      if (imageFile) { imageUrl = await uploadImage(); if (!imageUrl) return; }
      const payload = { ...form, image: imageUrl, retailPrice: +form.retailPrice, wholesalePrice: +form.wholesalePrice, countInStock: +form.countInStock, minWholesaleQuantity: +form.minWholesaleQuantity };
      const url    = editProduct ? `${API_BASE_URL}/products/${editProduct._id}` : `${API_BASE_URL}/products`;
      const method = editProduct ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: jsonHdr(), body: JSON.stringify(payload) });
      if (r.ok) {
        showToast(editProduct ? 'Product updated' : 'Product added');
        resetForm(); fetchProducts();
      } else {
        const d = await r.json();
        showToast(d.message || 'Failed to save product', 'error');
      }
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const deleteProduct = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const r = await fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE', headers: authHdr() });
      if (r.ok) { showToast('Product deleted'); fetchProducts(); }
      else showToast('Failed to delete product', 'error');
    } catch { showToast('Network error', 'error'); }
  };

  const startEdit = (p) => {
    setEditProduct(p);
    setForm({ name: p.name || '', category: p.category || '', retailPrice: p.retailPrice || '', wholesalePrice: p.wholesalePrice || '', countInStock: p.countInStock ?? '', description: p.description || '', brand: p.brand || '', image: p.image || '', minWholesaleQuantity: p.minWholesaleQuantity || '10' });
    setImagePreview(p.image || '');
    setImageFile(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => { setShowForm(false); setEditProduct(null); setForm(emptyForm); setImageFile(null); setImagePreview(''); };

  // ── Promotions ─────────────────────────────────────────────────────────────
  const sendPromotion = async () => {
    if (!promoSubject.trim() || !promoBody.trim()) { showToast('Subject and message are required', 'warning'); return; }
    setPromoSending(true);
    try {
      const r = await fetch(`${API_BASE_URL}/products/promotions`, { method: 'POST', headers: jsonHdr(), body: JSON.stringify({ subject: promoSubject, message: promoBody }) });
      const d = await r.json();
      if (r.ok) { showToast(`Promotion sent to ${d.recipients || 0} users`); setPromoSubject(''); setPromoBody(''); }
      else showToast(d.message || 'Failed to send promotion', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setPromoSending(false); }
  };

  // ── Export helpers ─────────────────────────────────────────────────────────
  const exportSalesCSV = () => {
    const rows = [['Product', 'Qty Sold', 'Revenue (KSh)', 'Orders']];
    salesData.forEach(r => rows.push([r.name, r.qty, r.revenue, r.orderCount]));
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `sales-summary-${today()}.csv`;
    a.click();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, fontFamily: 'system-ui, sans-serif' }}>
      <Spinner size={36} />
      <p style={{ color: '#64748b', fontSize: 15 }}>Loading admin dashboard…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const TABS = [
    { key: 'overview',   icon: '📊', label: 'Overview' },
    { key: 'orders',     icon: '🚚', label: `Orders (${orders.length})` },
    { key: 'inventory',  icon: '📦', label: `Inventory (${products.length})` },
    { key: 'sales',      icon: '📈', label: 'Sales Summary' },
    { key: 'customers',  icon: '👥', label: `Customers (${customers.length})` },
    { key: 'drivers',    icon: '🚴', label: 'Drivers' },
    { key: 'promotions', icon: '📣', label: 'Promotions' },
  ];

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#334155', background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select:focus, input:focus, textarea:focus { outline: 2px solid #166534; outline-offset: 1px; border-color: transparent; }
        @media (max-width: 600px) { .kpi-grid { grid-template-columns: 1fr 1fr !important; } .tab-label { display: none; } }
        @media (max-width: 400px) { .kpi-grid { grid-template-columns: 1fr !important; } }
        .tab-btn:hover { background: #f1f5f9 !important; }
        .row-hover:hover { background: #f8fafc !important; }
        .action-btn { transition: opacity .15s; }
        .action-btn:hover { opacity: .85; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #14532d, #166534, #15803d)', color: 'white', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
  <img src="/icons/icon-96x96.png" alt="Cerestrial Ventures" style={{ width: 26, height: 26, objectFit: 'contain' }} />
  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Cerestrial Ventures</h1>
</div>
              
              <p style={{ margin: 0, opacity: .8, fontSize: 13 }}>Admin Control Panel · {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { l: "Today's Revenue", v: fmt(todayRevenue) },
                { l: "Today's Orders",  v: todayOrders.length },
                { l: 'Total Revenue',   v: fmt(totalRevenue) },
                { l: 'Low Stock',       v: lowStock.length, danger: lowStock.length > 0 },
              ].map(s => (
                <div key={s.l} style={{ background: s.danger ? '#dc2626' : 'rgba(255,255,255,.15)', border: s.danger ? '1px solid #f87171' : '1px solid rgba(255,255,255,.2)', borderRadius: 10, padding: '8px 16px', textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: 10, opacity: .85, textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', overflowX: 'auto', display: 'flex', gap: 2, scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.key} className="tab-btn" onClick={() => setTab(t.key)} style={{ padding: '14px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? '#166534' : '#64748b', borderBottom: tab === t.key ? '2px solid #166534' : '2px solid transparent', whiteSpace: 'nowrap', transition: 'color .15s', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{t.icon}</span><span className="tab-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px' }}>

        {/* ═══════════════════════════════════════ OVERVIEW ══════════════════ */}
        {tab === 'overview' && (
          <>
            {/* KPI cards */}
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 24 }}>
              <KPICard label="Total Orders"      value={fmtNum(orders.length)}          sub="All time"                                        color="#16a34a" icon="🛒" onClick={() => setTab('orders')} />
              <KPICard label="Total Revenue"     value={fmt(totalRevenue)}              sub="Excl. cancelled"                                 color="#16a34a" icon="💰" />
              <KPICard label="Today's Orders"    value={todayOrders.length}             sub={`${fmt(todayRevenue)} today`}                    color="#3b82f6" icon="📅" onClick={() => setTab('orders')} />
              <KPICard label="Pending"           value={pendingCount}                   sub="Awaiting fulfilment"                             color="#f59e0b" icon="⏳" onClick={() => { setTab('orders'); setOrderStatus('Pending'); }} />
              <KPICard label="Delivered"         value={fmtNum(deliveredCount)}         sub={`${pct(deliveredCount, orders.length)}% rate`}   color="#16a34a" icon="✅" />
              <KPICard label="Products"          value={products.length}                sub={`${outOfStock.length} out of stock`}             color="#8b5cf6" icon="📦" onClick={() => setTab('inventory')} />
              <KPICard label="Low Stock"         value={lowStock.length}                sub="≤ 5 units remaining"                             color="#ef4444" icon="⚠️" onClick={() => { setTab('inventory'); setInvStock('low'); }} />
              <KPICard label="Customers"         value={customers.length || '—'}        sub="Registered accounts"                             color="#0891b2" icon="👥" onClick={() => setTab('customers')} />
            </div>

            {/* Low stock alert */}
            {lowStock.length > 0 && (
              <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <span style={{ color: '#b45309', fontWeight: 700, whiteSpace: 'nowrap' }}>⚠️ Low stock:</span>
                <span style={{ color: '#92400e', fontSize: 13 }}>{lowStock.map(p => `${p.name} (${p.countInStock} left)`).join(' · ')}</span>
              </div>
            )}

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Monthly Orders</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>Last 6 months</div>
                <BarChart data={ordersByMonth} labels={chartLabels} color="#16a34a" />
              </div>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Monthly Revenue</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>Last 6 months (KSh)</div>
                <BarChart data={revenueByMonth} labels={chartLabels} color="#3b82f6" formatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
              </div>
            </div>

            {/* Top products + Recent orders */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Top selling products */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>🏆 Products Sold Today</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>{todayLabel}</div>
                {topProducts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
                    <div style={{ fontSize: 13 }}>No delivered orders yet today.</div>
                  </div>
                ) : topProducts.map(([name, qty], i) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: ['#16a34a','#3b82f6','#f59e0b','#ef4444','#8b5cf6'][i], color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{qty} sold</span>
                  </div>
                ))}
              </div>

              {/* Recent orders */}
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>🕐 Recent Orders</div>
                  <button onClick={() => setTab('orders')} style={{ fontSize: 12, color: '#166534', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
                </div>
                {orders.slice(0, 6).map(o => (
                  <div key={o._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{o.customerName}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>#{o._id.slice(-6).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString('en-KE')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{fmt(o.totalAmount)}</div>
                      <Badge status={o.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════ ORDERS ════════════════════ */}
        {tab === 'orders' && (
          <>
            {/* Filters */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={lStyle}>Search</label>
                <input value={orderSearch} onChange={e => { setOrderSearch(e.target.value); setOrderPage(1); }} style={iStyle} placeholder="Name, phone, order ID…" />
              </div>
              <div style={{ flex: '0 1 160px' }}>
                <label style={lStyle}>Status</label>
                <select value={orderStatus} onChange={e => { setOrderStatus(e.target.value); setOrderPage(1); }} style={iStyle}>
                  <option value="">All statuses</option>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ flex: '0 1 150px' }}>
                <label style={lStyle}>Date</label>
                <input type="date" value={orderDate} onChange={e => { setOrderDate(e.target.value); setOrderPage(1); }} style={iStyle} />
              </div>
              <button onClick={() => { setOrderSearch(''); setOrderStatus(''); setOrderDate(''); setOrderPage(1); }} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                Clear filters
              </button>
            </div>

            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Showing {paginatedOrders.length} of {filteredOrders.length} orders
              {filteredOrders.length !== orders.length && ` (filtered from ${orders.length})`}
            </div>

            {selectedOrderIds.size > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>{selectedOrderIds.size} order{selectedOrderIds.size === 1 ? '' : 's'} selected</span>
                <button onClick={() => setShowBulkModal(true)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#166534', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  🚚 Assign Selected Orders
                </button>
                <button onClick={clearSelection} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', color: '#334155', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Clear selection
                </button>
                {eligibleFilteredCount > selectedOrderIds.size && (
                  <button onClick={selectAllFilteredEligible} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>
                    Select all {eligibleFilteredCount} unassigned orders (matching filters)
                  </button>
                )}
              </div>
            )}

            {/* Orders table */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 10px', width: 36 }}>
                        <input
                          type="checkbox"
                          checked={pageEligibleIds.length > 0 && pageEligibleIds.every(id => selectedOrderIds.has(id))}
                          onChange={toggleSelectAllOnPage}
                          disabled={pageEligibleIds.length === 0}
                          style={{ cursor: pageEligibleIds.length ? 'pointer' : 'default' }}
                        />
                      </th>
                      {['Order', 'Customer', 'Items', 'Total', 'Location', 'Date', 'Status', 'Assigned Driver', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#475569', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.length === 0 ? (
                      <tr><td colSpan={10} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No orders match your filters.</td></tr>
                    ) : paginatedOrders.map(o => (
                      <tr key={o._id} className="row-hover" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 10px' }}>
                          {isBulkSelectable(o) ? (
                            <input type="checkbox" checked={selectedOrderIds.has(o._id)} onChange={() => toggleSelectOrder(o._id)} style={{ cursor: 'pointer' }} />
                          ) : (
                            <span style={{ display: 'inline-block', width: 14 }} />
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#166534', fontSize: 12 }}>
                          #{o._id.slice(-6).toUpperCase()}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{o.customerName}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{o.phone}</div>
                          {o.email && <div style={{ fontSize: 11, color: '#94a3b8' }}>{o.email}</div>}
                        </td>
                        <td style={{ padding: '12px 14px', maxWidth: 160 }}>
                          {(o.items || []).slice(0, 3).map((it, i) => (
                            <div key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 1 }}>
                              {it.name} <span style={{ color: '#94a3b8' }}>×{it.quantity}</span>
                            </div>
                          ))}
                          {(o.items || []).length > 3 && <div style={{ fontSize: 11, color: '#94a3b8' }}>+{o.items.length - 3} more</div>}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>{fmt(o.totalAmount)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 12, color: '#334155', marginBottom: 4, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.location || <span style={{ color: '#94a3b8' }}>—</span>}
                          </div>
                          {o.latitude && o.longitude && (
                            <a href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#1d4ed8', textDecoration: 'none' }}>📍 View map</a>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(o.createdAt).toLocaleDateString('en-KE')}<br />
                          <span style={{ color: '#94a3b8' }}>{new Date(o.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <select
                            value={o.status}
                            onChange={e => updateOrderStatus(o._id, e.target.value)}
                            style={{ ...iStyle, fontSize: 12, padding: '6px 8px', width: 'auto', minWidth: 130, fontWeight: 600, color: STATUS_META[o.status]?.color || '#334155', background: STATUS_META[o.status]?.bg || '#f1f5f9', border: `1px solid ${STATUS_META[o.status]?.color || '#cbd5e1'}44` }}
                          >
                            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '12px 14px', minWidth: 160 }}>
                          {o.driver ? (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{o.driver.name}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{o.driver.phone}</div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => setModalOrder(o)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white', color: '#334155', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Reassign</button>
                                {o.status === 'Assigned to Driver' && (
                                  <button onClick={() => handleRemoveDriver(o._id)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Remove</button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Not assigned</span>
                              <button onClick={() => setModalOrder(o)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#166534', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Assign Driver</button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {o.latitude && o.longitude && (
                            <a
                              href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`}
                              target="_blank" rel="noreferrer"
                              className="action-btn"
                              style={{ display: 'inline-block', padding: '5px 10px', background: '#1d4ed8', color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                            >
                              🗺️ Map
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
                <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: orderPage === 1 ? 'default' : 'pointer', color: orderPage === 1 ? '#cbd5e1' : '#334155', fontSize: 13 }}>← Prev</button>
                <span style={{ fontSize: 13, color: '#64748b' }}>Page {orderPage} of {totalPages}</span>
                <button onClick={() => setOrderPage(p => Math.min(totalPages, p + 1))} disabled={orderPage === totalPages} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: orderPage === totalPages ? 'default' : 'pointer', color: orderPage === totalPages ? '#cbd5e1' : '#334155', fontSize: 13 }}>Next →</button>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════ INVENTORY ═════════════════ */}
        {tab === 'inventory' && (
          <>
            {/* Low/out of stock alerts */}
            {lowStock.length > 0 && (
              <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <strong style={{ color: '#b45309' }}>⚠️ Low stock ({lowStock.length}):</strong>{' '}
                <span style={{ color: '#92400e', fontSize: 13 }}>{lowStock.map(p => `${p.name} (${p.countInStock})`).join(' · ')}</span>
              </div>
            )}
            {outOfStock.length > 0 && (
              <div style={{ background: '#fee2e2', border: '1px solid #f87171', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <strong style={{ color: '#991b1b' }}>🚫 Out of stock ({outOfStock.length}):</strong>{' '}
                <span style={{ color: '#991b1b', fontSize: 13 }}>{outOfStock.map(p => p.name).join(' · ')}</span>
              </div>
            )}

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={lStyle}>Search products</label>
                <input value={invSearch} onChange={e => setInvSearch(e.target.value)} style={iStyle} placeholder="Name or brand…" />
              </div>
              <div style={{ flex: '0 1 150px' }}>
                <label style={lStyle}>Category</label>
                <select value={invCat} onChange={e => setInvCat(e.target.value)} style={iStyle}>
                  <option value="">All categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: '0 1 140px' }}>
                <label style={lStyle}>Stock level</label>
                <select value={invStock} onChange={e => setInvStock(e.target.value)} style={iStyle}>
                  <option value="">All</option>
                  <option value="ok">In stock</option>
                  <option value="low">Low (≤5)</option>
                  <option value="out">Out of stock</option>
                </select>
              </div>
              <button
                onClick={() => { resetForm(); setShowForm(f => !f); }}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: showForm ? '#dc2626' : '#166534', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {showForm ? '✕ Cancel' : '+ Add Product'}
              </button>
            </div>

            {/* Add / Edit form */}
            {showForm && (
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  {editProduct ? '✏️ Edit Product' : '➕ New Product'}
                </h3>
                <form onSubmit={handleProductSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div><label style={lStyle}>Product name *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={iStyle} placeholder="e.g. Mumias Sugar 2kg" /></div>
                    <div>
                      <label style={lStyle}>Category *</label>
                      <select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={iStyle}>
                        <option value="">— Select —</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        {form.category && !categories.includes(form.category) && <option value={form.category}>{form.category}</option>}
                      </select>
                    </div>
                    <div><label style={lStyle}>Brand</label><input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} style={iStyle} placeholder="e.g. Mumias" /></div>
                    <div><label style={lStyle}>Retail price (KSh) *</label><input required type="number" min="0" value={form.retailPrice} onChange={e => setForm({ ...form, retailPrice: e.target.value })} style={iStyle} placeholder="230" /></div>
                    <div><label style={lStyle}>Wholesale price (KSh) *</label><input required type="number" min="0" value={form.wholesalePrice} onChange={e => setForm({ ...form, wholesalePrice: e.target.value })} style={iStyle} placeholder="210" /></div>
                    <div><label style={lStyle}>Stock quantity *</label><input required type="number" min="0" value={form.countInStock} onChange={e => setForm({ ...form, countInStock: e.target.value })} style={iStyle} placeholder="50" /></div>
                    <div><label style={lStyle}>Min wholesale qty</label><input type="number" min="1" value={form.minWholesaleQuantity} onChange={e => setForm({ ...form, minWholesaleQuantity: e.target.value })} style={iStyle} placeholder="10" /></div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lStyle}>Product image</label>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div
                          onClick={() => fileRef.current?.click()}
                          style={{ width: 110, height: 110, borderRadius: 10, border: '2px dashed #cbd5e1', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexShrink: 0 }}
                        >
                          {imagePreview
                            ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: 28 }}>📷</div><div style={{ fontSize: 11, marginTop: 4 }}>Click to upload</div></div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (!f) return; if (f.size > 5 * 1024 * 1024) { showToast('Image exceeds 5 MB', 'error'); return; } setImageFile(f); setImagePreview(URL.createObjectURL(f)); }} style={{ display: 'none' }} />
                          <button type="button" onClick={() => fileRef.current?.click()} style={{ padding: '9px 18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 10 }}>📁 Choose file</button>
                          {imageFile && <div style={{ fontSize: 12, color: '#15803d', marginBottom: 8 }}>✅ {imageFile.name}</div>}
                          <label style={{ ...lStyle, marginTop: 4 }}>Or paste image URL</label>
                          <input value={form.image} onChange={e => { setForm({ ...form, image: e.target.value }); setImagePreview(e.target.value); setImageFile(null); }} style={iStyle} placeholder="https://…" />
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>JPG, PNG, WebP · max 5 MB</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={lStyle}>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...iStyle, resize: 'vertical' }} placeholder="Short product description…" /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button type="submit" disabled={submitting || uploading} style={{ padding: '11px 28px', background: submitting ? '#86efac' : '#166534', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                      {uploading ? '📤 Uploading…' : submitting ? '💾 Saving…' : editProduct ? '💾 Save changes' : '➕ Add product'}
                    </button>
                    <button type="button" onClick={resetForm} style={{ padding: '11px 20px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Products table */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#64748b' }}>
                {filteredProds.length} of {products.length} products
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 660 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Product', 'Category', 'Retail', 'Wholesale', 'Min Wholesale Qty', 'Stock', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#475569', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProds.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No products match your filters.</td></tr>
                    ) : filteredProds.map(p => (
                      <tr key={p._id} className="row-hover" style={{ borderBottom: '1px solid #f1f5f9', background: p.countInStock === 0 ? '#fff5f5' : p.countInStock <= 5 ? '#fffbeb' : 'white' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {p.image
                              ? <img src={p.image} alt={p.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                              : <div style={{ width: 44, height: 44, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📦</div>}
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.brand || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{p.category}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#166534', whiteSpace: 'nowrap' }}>{fmt(p.retailPrice)}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmt(p.wholesalePrice)}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b', textAlign: 'center' }}>{p.minWholesaleQuantity || 10}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: p.countInStock === 0 ? '#fee2e2' : p.countInStock <= 5 ? '#fef3c7' : '#dcfce7', color: p.countInStock === 0 ? '#dc2626' : p.countInStock <= 5 ? '#b45309' : '#166534', whiteSpace: 'nowrap' }}>
                            {p.countInStock === 0 ? '🚫 Out' : p.countInStock <= 5 ? `⚠️ ${p.countInStock}` : `${p.countInStock} units`}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => startEdit(p)} className="action-btn" style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>✏️ Edit</button>
                            <button onClick={() => deleteProduct(p._id, p.name)} className="action-btn" style={{ padding: '6px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🗑️ Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════ SALES SUMMARY ═════════════ */}
        {tab === 'sales' && (
          <>
            {/* Range picker */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {[['today', 'Today'], ['week', 'Last 7 days'], ['month', 'Last 30 days'], ['custom', 'Custom range']].map(([v, l]) => (
                <button key={v} onClick={() => setSalesRange(v)} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${salesRange === v ? '#166534' : '#e2e8f0'}`, background: salesRange === v ? '#166534' : 'white', color: salesRange === v ? 'white' : '#64748b', cursor: 'pointer', fontWeight: salesRange === v ? 700 : 500, fontSize: 13 }}>{l}</button>
              ))}
              {salesRange === 'custom' && (
                <>
                  <div><label style={lStyle}>From</label><input type="date" value={salesFrom} onChange={e => setSalesFrom(e.target.value)} style={{ ...iStyle, width: 150 }} /></div>
                  <div><label style={lStyle}>To</label><input type="date" value={salesTo} onChange={e => setSalesTo(e.target.value)} style={{ ...iStyle, width: 150 }} /></div>
                </>
              )}
              <button onClick={buildSalesSummary} style={{ padding: '9px 18px', background: '#166534', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>🔄 Refresh</button>
              <button onClick={exportSalesCSV} style={{ padding: '9px 18px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, marginLeft: 'auto' }}>⬇️ Export CSV</button>
            </div>

            {/* Summary KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
              <KPICard label="Products sold" value={salesData.reduce((s, r) => s + r.qty, 0)}                  color="#16a34a" icon="📦" />
              <KPICard label="Total revenue"  value={fmt(salesData.reduce((s, r) => s + r.revenue, 0))}        color="#3b82f6" icon="💰" />
              <KPICard label="Total orders"   value={new Set(orders.filter(o => { const { from, to } = computeSalesRange(); const t = new Date(o.createdAt).getTime(); return t >= new Date(from).setHours(0,0,0,0) && t <= new Date(to).setHours(23,59,59,999) && o.status !== 'Cancelled'; }).map(o => o._id)).size} color="#f59e0b" icon="🛒" />
              <KPICard label="Unique items"   value={salesData.length}                                          color="#8b5cf6" icon="🏷️" />
            </div>

            {salesLoading ? (
              <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={32} /></div>
            ) : (
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        {['#', 'Product', 'Qty sold', 'Revenue', 'Orders', 'Avg per order'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No sales data for this period.</td></tr>
                      ) : salesData.map((r, i) => (
                        <tr key={r.name} className="row-hover" style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 700, width: 40 }}>{i + 1}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{r.name}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontWeight: 700, color: '#166534' }}>{fmtNum(r.qty)}</span>
                            <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 4, width: 80 }}>
                              <div style={{ height: '100%', background: '#16a34a', borderRadius: 2, width: `${Math.round((r.qty / Math.max(...salesData.map(x => x.qty))) * 100)}%` }} />
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#166534', whiteSpace: 'nowrap' }}>{fmt(r.revenue)}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.orderCount}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{fmt(r.orderCount ? Math.round(r.revenue / r.orderCount) : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {salesData.length > 0 && (
                      <tfoot>
                        <tr style={{ background: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
                          <td colSpan={2} style={{ padding: '12px 16px', fontWeight: 700, color: '#166534' }}>Totals</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#166534' }}>{fmtNum(salesData.reduce((s, r) => s + r.qty, 0))}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#166534', whiteSpace: 'nowrap' }}>{fmt(salesData.reduce((s, r) => s + r.revenue, 0))}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════ CUSTOMERS ═════════════════ */}
        {tab === 'customers' && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            {customers.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
                <p>No registered customers yet — or the <code>/admin/customers</code> endpoint needs to be added to your server.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Name', 'Email', 'Phone', 'Account type', 'Joined', 'Orders'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(c => {
                      const userOrders = orders.filter(o => o.email === c.email || o.userId === c._id);
                      return (
                        <tr key={c._id} className="row-hover" style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                {(c.name || '?')[0].toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{c.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{c.email}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{c.phone || '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ background: c.accountType === 'Wholesale' ? '#dbeafe' : '#dcfce7', color: c.accountType === 'Wholesale' ? '#1d4ed8' : '#166534', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{c.accountType || 'Retail'}</span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(c.createdAt).toLocaleDateString('en-KE')}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#166534' }}>{userOrders.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════ DRIVERS ═══════════════════ */}
        {tab === 'drivers' && <AdminDrivers />}

        {/* ═══════════════════════════════════════ PROMOTIONS ════════════════ */}
        {tab === 'promotions' && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '24px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>📣 Promotion Broadcast</h3>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b' }}>Send a promotional email to all users who have enabled promotions in their notification preferences.</p>
              <div style={{ marginBottom: 16 }}>
                <label style={lStyle}>Subject line *</label>
                <input value={promoSubject} onChange={e => setPromoSubject(e.target.value)} style={iStyle} placeholder="e.g. 20% off all cooking oils this weekend!" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={lStyle}>Message body *</label>
                <textarea value={promoBody} onChange={e => setPromoBody(e.target.value)} rows={6} style={{ ...iStyle, resize: 'vertical' }} placeholder="Write the promotion details here…" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={sendPromotion} disabled={promoSending} style={{ padding: '12px 28px', background: promoSending ? '#86efac' : '#166534', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: promoSending ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                  {promoSending ? '📤 Sending…' : '📤 Send promotion'}
                </button>
                <button onClick={() => { setPromoSubject(''); setPromoBody(''); }} style={{ padding: '12px 20px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Clear</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Assign Driver Modal ── */}
      {modalOrder && (
        <AssignDriverModal
          order={modalOrder}
          drivers={drivers}
          assigning={assigningId === modalOrder._id}
          onAssign={(driverId) => handleAssignDriver(modalOrder._id, driverId)}
          onClose={() => setModalOrder(null)}
        />
      )}

      {/* ── Bulk Assign Driver Modal ── */}
      {showBulkModal && (
        <BulkAssignModal
          count={selectedOrderIds.size}
          drivers={drivers}
          assigning={bulkAssigning}
          onAssign={handleBulkAssign}
          onClose={() => setShowBulkModal(false)}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AdminDashboard;