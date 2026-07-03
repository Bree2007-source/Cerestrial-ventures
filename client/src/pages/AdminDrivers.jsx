import React, { useState, useEffect, useMemo } from 'react';
import API_BASE_URL from '../config';

const getToken = () => localStorage.getItem('cv-token') || '';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  vehicleType: 'Van',
  vehicleRegistration: '',
  password: '',
};

const AdminDrivers = () => {
  const [drivers, setDrivers]           = useState([]);
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [search, setSearch]             = useState('');

  const [showModal, setShowModal]       = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [viewingDriver, setViewingDriver] = useState(null);
  const [form, setForm]                 = useState(emptyForm);
  const [saving, setSaving]             = useState(false);
  const [actionError, setActionError]   = useState('');

  useEffect(() => {
    Promise.all([fetchDrivers(), fetchOrders()]);
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`${API_BASE_URL}/drivers`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Could not load drivers.');
      }
      const data = await res.json();
      setDrivers(data);
    } catch (err) {
      setLoadError(err.message || 'Could not load drivers.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      // Ignore order fetch errors; the table can still show driver data.
    }
  };

  // ── Stat cards ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total    = drivers.length;
    const onDelivery = drivers.filter(d => d.status === 'On Delivery').length;
    const active    = drivers.filter(d => d.isActive).length;
    const offline   = drivers.filter(d => d.status === 'Offline').length;
    return { total, onDelivery, active, offline };
  }, [drivers]);

  // ── Search filter ─────────────────────────────────────────────────────
  const filteredDrivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(d =>
      d.name?.toLowerCase().includes(q) ||
      d.phone?.toLowerCase().includes(q) ||
      d.vehicleRegistration?.toLowerCase().includes(q)
    );
  }, [drivers, search]);

  const getAssignedDeliveryCount = (driverId) => {
    const activeStatuses = ['Assigned to Driver', 'Driver On The Way', 'Arrived'];
    return orders.filter((order) => {
      const assignedDriver = order.driver?._id || order.driver;
      return assignedDriver?.toString() === driverId?.toString() && activeStatuses.includes(order.status);
    }).length;
  };

  // ── Modal open/close ──────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingDriver(null);
    setForm(emptyForm);
    setActionError('');
    setShowModal(true);
  };

  const openEditModal = (driver) => {
    setEditingDriver(driver);
    setForm({
      name: driver.name || '',
      phone: driver.phone || '',
      email: driver.email || '',
      vehicleType: driver.vehicleType || 'Van',
      vehicleRegistration: driver.vehicleRegistration || '',
      password: '',
    });
    setActionError('');
    setShowModal(true);
  };

  const openViewModal = (driver) => {
    setViewingDriver(driver);
    setActionError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDriver(null);
    setForm(emptyForm);
    setActionError('');
  };

  const closeViewModal = () => {
    setViewingDriver(null);
    setActionError('');
  };

  // ── Save (create or edit) ────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionError('');
    try {
      const isEdit = !!editingDriver;
      const url = isEdit ? `${API_BASE_URL}/drivers/${editingDriver._id}` : `${API_BASE_URL}/drivers`;
      const method = isEdit ? 'PUT' : 'POST';

      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Save failed');
      }

      await fetchDrivers();
      closeModal();
    } catch (err) {
      setActionError(err.message || 'Could not save driver. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = async (driver) => {
    if (!window.confirm(`Delete driver "${driver.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/drivers/${driver._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Delete failed');
      }

      setDrivers(prev => prev.filter(d => d._id !== driver._id));
    } catch (err) {
      alert(err.message || 'Could not delete driver. Please try again.');
    }
  };

  // ── Toggle active/deactivate ─────────────────────────────────────────
  const handleToggleActive = async (driver) => {
    try {
      const res = await fetch(`${API_BASE_URL}/drivers/${driver._id}/toggle-active`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Toggle failed');
      }

      const updated = await res.json();
      setDrivers(prev => prev.map(d => d._id === updated._id ? updated : d));
    } catch (err) {
      alert(err.message || 'Could not update driver status. Please try again.');
    }
  };

  // ── Styles (matches the green Cerestrial Ventures theme) ────────────
  const card = {
    flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
    padding: '18px 20px', borderLeft: '4px solid #15803d',
  };
  const statLabel = { fontSize: 13, color: '#64748b', marginBottom: 6 };
  const statValue = { fontSize: 26, fontWeight: 800, color: '#14532d' };

  const th = {
    textAlign: 'left', fontSize: 12.5, color: '#64748b', fontWeight: 700,
    padding: '10px 14px', borderBottom: '2px solid #f1f5f9', textTransform: 'uppercase',
  };
  const td = { padding: '14px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#1e293b' };

  const btn = (bg, color = '#fff') => ({
    padding: '6px 12px', borderRadius: 6, border: 'none', background: bg,
    color, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', marginRight: 6,
  });

  const inp = {
    width: '100%', padding: '11px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1e293b',
    background: '#f8fafc', fontFamily: 'inherit',
  };
  const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 };

  const statusColor = (isActive) => {
    if (isActive) return { bg: '#dcfce7', text: '#166534' };
    return { bg: '#f1f5f9', text: '#64748b' };
  };

  return (
    <div style={{ padding: 24, fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={card}>
          <div style={statLabel}>Total Drivers</div>
          <div style={statValue}>{stats.total}</div>
        </div>
        <div style={{ ...card, borderLeftColor: '#d97706' }}>
          <div style={statLabel}>On Delivery</div>
          <div style={{ ...statValue, color: '#92400e' }}>{stats.onDelivery}</div>
        </div>
        <div style={{ ...card, borderLeftColor: '#16a34a' }}>
          <div style={statLabel}>Active Drivers</div>
          <div style={{ ...statValue, color: '#166534' }}>{stats.active}</div>
        </div>
        <div style={{ ...card, borderLeftColor: '#94a3b8' }}>
          <div style={statLabel}>Offline Drivers</div>
          <div style={{ ...statValue, color: '#475569' }}>{stats.offline}</div>
        </div>
      </div>

      {/* ── Search + Add ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name, phone, or plate..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inp, flex: 1 }}
        />
        <button
          onClick={openAddModal}
          style={{
            padding: '0 22px', borderRadius: 8, border: 'none', background: '#15803d',
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          + Add Driver
        </button>
      </div>

      {loadError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          ⚠️ {loadError}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Full Name</th>
              <th style={th}>Phone Number</th>
              <th style={th}>Vehicle Type</th>
              <th style={th}>Status</th>
              <th style={th}>Assigned Deliveries</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td style={td} colSpan={7}>Loading drivers...</td></tr>
            )}
            {!loading && filteredDrivers.length === 0 && (
              <tr><td style={td} colSpan={7}>No drivers found.</td></tr>
            )}
            {!loading && filteredDrivers.map(driver => {
              const sc = statusColor(driver.isActive);
              return (
                <tr key={driver._id}>
                  <td style={td}>
                    <div style={{ fontWeight: 700 }}>{driver.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{driver.email}</div>
                  </td>
                  <td style={td}>{driver.phone}</td>
                  <td style={td}>{driver.vehicleType || '—'}</td>
                  <td style={td}>
                    <span style={{
                      background: sc.bg, color: sc.text, padding: '4px 10px',
                      borderRadius: 999, fontSize: 12, fontWeight: 700,
                    }}>
                      {driver.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={td}>{getAssignedDeliveryCount(driver._id)}</td>
                  <td style={td}>
                    <button style={btn('#e2e8f0', '#334155')} onClick={() => openViewModal(driver)}>View</button>
                    <button style={btn('#e2e8f0', '#334155')} onClick={() => openEditModal(driver)}>Edit</button>
                    <button style={btn('#fde68a', '#92400e')} onClick={() => handleToggleActive(driver)}>
                      {driver.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button style={btn('#fecaca', '#991b1b')} onClick={() => handleDelete(driver)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── View Modal ───────────────────────────────────────────── */}
      {viewingDriver && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, maxWidth: '90vw' }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: '#14532d', margin: '0 0 16px' }}>
              Driver Details
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: '#334155' }}>
              <div><strong>Name:</strong> {viewingDriver.name}</div>
              <div><strong>Phone:</strong> {viewingDriver.phone}</div>
              <div><strong>Email:</strong> {viewingDriver.email || '—'}</div>
              <div><strong>Vehicle Type:</strong> {viewingDriver.vehicleType || '—'}</div>
              <div><strong>Status:</strong> {viewingDriver.isActive ? 'Active' : 'Inactive'}</div>
              <div><strong>Assigned Deliveries:</strong> {getAssignedDeliveryCount(viewingDriver._id)}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                type="button" onClick={closeViewModal}
                style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, maxWidth: '90vw' }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: '#14532d', margin: '0 0 16px' }}>
              {editingDriver ? 'Edit Driver' : 'Add New Driver'}
            </h2>

            {actionError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleSave}>
              <label style={label}>Full Name *</label>
              <input
                type="text" required style={inp}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />

              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Phone *</label>
                  <input
                    type="tel" required style={inp}
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Email</label>
                  <input
                    type="email" style={inp}
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Vehicle Type</label>
                  <select
                    style={inp}
                    value={form.vehicleType}
                    onChange={e => setForm({ ...form, vehicleType: e.target.value })}
                  >
                    <option value="Motorbike">Motorbike</option>
                    <option value="Car">Car</option>
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Vehicle Reg. No.</label>
                  <input
                    type="text" style={inp}
                    value={form.vehicleRegistration}
                    onChange={e => setForm({ ...form, vehicleRegistration: e.target.value })}
                  />
                </div>
              </div>

              <label style={{ ...label, marginTop: 14 }}>
                Password {editingDriver ? '(leave blank to keep current)' : '(defaults to "driver123" if blank)'}
              </label>
              <input
                type="password" style={inp}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button
                  type="button" onClick={closeModal}
                  style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 8, border: 'none',
                    background: saving ? '#86efac' : '#15803d', color: '#fff', fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : (editingDriver ? 'Save Changes' : 'Add Driver')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDrivers;