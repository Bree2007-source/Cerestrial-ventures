import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from '../config';
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

// ── Helper: format the real MongoDB createdAt timestamp ──────────────────────
function formatMemberSince(isoString) {
  if (!isoString) return 'Unknown';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingBiz, setEditingBiz] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [realOrders, setRealOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ── Profile data fetched fresh from the API ────────────────────────────────
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [personal, setPersonal] = useState({
    firstName: "", lastName: "",
    email: "", phone: "", accountType: "Retail",
  });
  const [personalDraft, setPersonalDraft] = useState({ ...personal });

  const [biz, setBiz] = useState({
    businessName: "", kraPin: "", bizType: "Sole Proprietor",
  });
  const [bizDraft, setBizDraft] = useState({ ...biz });

  const [notifications, setNotifications] = useState({
    orderUpdates: true, promotions: true, restock: false,
  });

  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState({ id: '', title: '', line1: '', line2: '', country: 'Kenya', isDefault: false });
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('cv-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ── Fetch full profile from API (gets real createdAt) ─────────────────────
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/users/profile`, {
        headers: getAuthHeaders(),
      });
      const data = res.data;
      setProfileData(data);

      const [firstName = '', ...rest] = (data.name || '').split(' ');
      const lastName = rest.join(' ');
      const updated = {
        firstName: firstName || '',
        lastName: lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        accountType: data.accountType || 'Retail',
      };
      setPersonal(updated);
      setPersonalDraft(updated);

      if (data.businessInfo) {
        const bizInfo = {
          businessName: data.businessInfo.businessName || '',
          kraPin: data.businessInfo.kraPin || '',
          bizType: data.businessInfo.bizType || 'Sole Proprietor',
        };
        setBiz(bizInfo);
        setBizDraft(bizInfo);
      }

      if (data.notificationPreferences) {
        setNotifications(data.notificationPreferences);
      }

      // Sync back to AuthContext so the rest of the app is up to date
      if (updateUser) updateUser(data);
    } catch (err) {
      console.warn('Could not fetch profile:', err.message);
      // Fall back to whatever is in AuthContext
      if (user) {
        const [firstName = '', ...rest] = (user.name || '').split(' ');
        const lastName = rest.join(' ');
        setPersonal(prev => ({
          ...prev,
          firstName,
          lastName,
          email: user.email || '',
          phone: user.phone || '',
        }));
        setPersonalDraft(prev => ({
          ...prev,
          firstName,
          lastName,
          email: user.email || '',
          phone: user.phone || '',
        }));
        if (user.notificationPreferences) setNotifications(user.notificationPreferences);
      }
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  // Fetch on mount and whenever user changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Poll every 60 seconds for real-time-ish updates
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchProfile, 60000);
    return () => clearInterval(interval);
  }, [user, fetchProfile]);

  // ── Orders ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'orders') return;
    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/orders/my`, {
          headers: getAuthHeaders(),
        });
        setRealOrders(Array.isArray(res.data) ? res.data : []);
      } catch {
        setRealOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [activeTab]);

  const totalSpent = realOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalItemsPurchased = realOrders.reduce((sum, order) => {
    if (!Array.isArray(order.items)) return sum;
    return sum + order.items.reduce((s, item) => s + (Number(item.quantity) || 0), 0);
  }, 0);

  const statusColors = {
    'Delivered':         { background: "#0f3d1a", color: "#4aa85a" },
    'Processing Order':  { background: "#3a2800", color: "#e6a817" },
    'Processing':        { background: "#3a2800", color: "#e6a817" },
    'Pending':           { background: "#3a2800", color: "#e6a817" },
    'Order Received':    { background: "#1a2a4a", color: "#5a9ae6" },
    'Payment Confirmed': { background: "#1a2a4a", color: "#5a9ae6" },
    'Paid':              { background: "#1a2a4a", color: "#5a9ae6" },
    'Packed':            { background: "#2a1a4a", color: "#9a5ae6" },
    'Out for Delivery':  { background: "#3a2800", color: "#e6a817" },
    'Cancelled':         { background: "#3a0f0f", color: "#e05a5a" },
  };

  // ── Save personal info to API ──────────────────────────────────────────────
  const handleSavePersonal = async () => {
    setSaveError('');
    setSaveSuccess('');
    try {
      const payload = {
        name: `${personalDraft.firstName} ${personalDraft.lastName}`.trim(),
        email: personalDraft.email,
        phone: personalDraft.phone,
        accountType: personalDraft.accountType,
      };
      const res = await axios.put(`${API_BASE_URL}/users/profile`, payload, {
        headers: getAuthHeaders(),
      });
      setPersonal(personalDraft);
      setEditingPersonal(false);
      setSaveSuccess('Profile updated!');
      if (updateUser) updateUser(res.data);
      // Re-fetch to make sure everything is in sync
      setTimeout(fetchProfile, 500);
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save. Please try again.');
    }
  };

  // ── Save business info to API ──────────────────────────────────────────────
  const handleSaveBiz = async () => {
    setSaveError('');
    try {
      await axios.put(`${API_BASE_URL}/users/profile`, { businessInfo: bizDraft }, {
        headers: getAuthHeaders(),
      });
      setBiz(bizDraft);
      setEditingBiz(false);
      setSaveSuccess('Business info updated!');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save business info.');
    }
  };

  // ── Addresses (local state — wire to API if you have an endpoint) ──────────
  const startAddAddress = () => {
    setAddressForm({ id: Date.now().toString(), title: '', line1: '', line2: '', country: 'Kenya', isDefault: false });
    setIsEditingAddress(true);
  };
  const startEditAddress = (address) => { setAddressForm({ ...address }); setIsEditingAddress(true); };
  const saveAddress = () => {
    setAddresses(prev => {
      const exists = prev.some(a => a.id === addressForm.id);
      let updated = exists ? prev.map(a => a.id === addressForm.id ? addressForm : a) : [...prev, addressForm];
      if (addressForm.isDefault) updated = updated.map(a => ({ ...a, isDefault: a.id === addressForm.id }));
      return updated;
    });
    setIsEditingAddress(false);
  };
  const setDefaultAddress = (id) => setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
  const removeAddress = (id) => setAddresses(prev => {
    const next = prev.filter(a => a.id !== id);
    if (!next.some(a => a.isDefault) && next.length > 0) next[0].isDefault = true;
    return next;
  });

  // ── Notification prefs ─────────────────────────────────────────────────────
  const handleNotificationToggle = async (key) => {
    const nextValue = !notifications[key];
    const nextPrefs = { ...notifications, [key]: nextValue };
    setNotifications(nextPrefs);
    setNotificationSaving(true);
    setSettingsMessage('Saving...');
    try {
      await axios.put(`${API_BASE_URL}/users/notifications`, nextPrefs, {
        headers: getAuthHeaders(),
      });
      setSettingsMessage(`${key.replace(/([A-Z])/g, ' $1')} ${nextValue ? 'enabled' : 'disabled'}.`);
      if (updateUser) updateUser({ notificationPreferences: nextPrefs });
    } catch {
      setNotifications(prev => ({ ...prev, [key]: !nextValue }));
      setSettingsMessage('Unable to save preference.');
    } finally {
      setNotificationSaving(false);
      setTimeout(() => setSettingsMessage(''), 2500);
    }
  };

  const handleSignOut = () => { logout(); navigate('/login'); };
  const handleDeleteAccount = () => {
    if (window.confirm('Delete account? This cannot be undone.')) { logout(); navigate('/login'); }
  };
  const handleTogglePasswordForm = () => {
    setShowPasswordForm(c => !c);
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
  };
  const handleUpdatePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      alert('Fill in all fields.'); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match.'); return;
    }
    try {
      await axios.put(`${API_BASE_URL}/users/change-password`, {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      }, { headers: getAuthHeaders() });
      alert('Password updated!');
      setShowPasswordForm(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update password.');
    }
  };

  function Toggle({ on, onToggle }) {
    return (
      <div
        className="toggle"
        onClick={onToggle}
        style={{ background: on ? "#1d6b2a" : "#1a4a22" }}
      >
        <div className="toggle-knob" style={{ left: on ? 21 : 3 }} />
      </div>
    );
  }

  const initials = `${personal.firstName?.[0] || ''}${personal.lastName?.[0] || ''}`.toUpperCase()
    || user?.name?.[0]?.toUpperCase() || '?';

  // ── Real createdAt from the API response ───────────────────────────────────
  const memberSince = formatMemberSince(profileData?.createdAt || user?.createdAt);

  return (
    <div className="profile-page">

      {/* Header */}
      <div className="profile-header">
        <div className="profile-header-row">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-name-block">
            <div className="profile-name">
              <span className="profile-name-text">
                {profileData?.name || user?.name || `${personal.firstName} ${personal.lastName}`.trim() || 'User'}
              </span>
              <span className="account-badge">{personal.accountType}</span>
            </div>
            {/* ✅ FIXED: real createdAt from DB, not hardcoded */}
            <div className="profile-meta">
              📍 Nairobi, Kenya · Member since {profileLoading ? '…' : memberSince}
            </div>
            <div className="profile-verified">✅ Verified account</div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="profile-stats">
          {[
            [realOrders.length, "Orders", "📦"],
            [totalItemsPurchased, "Items Bought", "🧺"],
            [`KSh ${totalSpent.toLocaleString()}`, "Spent", "💰"],
          ].map(([n, l, icon]) => (
            <div key={l} className="profile-stat-card">
              <div className="profile-stat-icon">{icon}</div>
              <div className="profile-stat-value">{n}</div>
              <div className="profile-stat-label">{l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          {[
            { key: "info", label: "👤 Profile" },
            { key: "orders", label: "📦 Orders" },
            { key: "addresses", label: "📍 Addresses" },
            { key: "settings", label: "⚙️ Settings" },
          ].map(tab => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`profile-tab ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      <div className="profile-content">

        {/* Global save feedback */}
        {saveSuccess && (
          <div style={{
            background: '#0f3d1a', border: '1px solid #1d6b2a', color: '#4aa85a',
            padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontSize: 14,
          }}>
            ✅ {saveSuccess}
          </div>
        )}
        {saveError && (
          <div style={{
            background: '#3a0f0f', border: '1px solid #7a2020', color: '#e05a5a',
            padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontSize: 14,
          }}>
            ❌ {saveError}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "info" && (
          <>
            <div className="profile-card">
              <div className="profile-card-header">
                <span className="profile-card-title">👤 Personal Info</span>
                <button className="btn-outline" onClick={() => { setPersonalDraft({ ...personal }); setEditingPersonal(true); setSaveError(''); }}>Edit</button>
              </div>
              {!editingPersonal ? (
                <>
                  <div className="field-grid-2">
                    {[["First name", personal.firstName], ["Last name", personal.lastName]].map(([label, val]) => (
                      <div className="field" key={label}>
                        <label className="field-label">{label}</label>
                        <div className="field-value">{val || '—'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label className="field-label">Email</label>
                    <div className="field-value">{personal.email || '—'}</div>
                  </div>
                  <div className="field-grid-2">
                    {[["Phone", personal.phone], ["Account type", personal.accountType]].map(([label, val]) => (
                      <div className="field" key={label}>
                        <label className="field-label">{label}</label>
                        <div className="field-value">{val || '—'}</div>
                      </div>
                    ))}
                  </div>
                  {/* ✅ Show real account creation date */}
                  <div className="field" style={{ marginTop: 10 }}>
                    <label className="field-label">Account created</label>
                    <div className="field-value">
                      {profileLoading ? 'Loading…' : memberSince}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="field-grid-2">
                    <div className="field">
                      <label className="field-label">First name</label>
                      <input className="field-input" value={personalDraft.firstName} onChange={e => setPersonalDraft({ ...personalDraft, firstName: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="field-label">Last name</label>
                      <input className="field-input" value={personalDraft.lastName} onChange={e => setPersonalDraft({ ...personalDraft, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label className="field-label">Email</label>
                    <input className="field-input" value={personalDraft.email} onChange={e => setPersonalDraft({ ...personalDraft, email: e.target.value })} />
                  </div>
                  <div className="field-grid-2" style={{ marginBottom: 12 }}>
                    <div className="field">
                      <label className="field-label">Phone</label>
                      <input className="field-input" value={personalDraft.phone} onChange={e => setPersonalDraft({ ...personalDraft, phone: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="field-label">Account type</label>
                      <select className="field-select" value={personalDraft.accountType} onChange={e => setPersonalDraft({ ...personalDraft, accountType: e.target.value })}>
                        <option>Retail</option>
                        <option>Wholesale</option>
                      </select>
                    </div>
                  </div>
                  <div className="field-actions">
                    <button className="btn-cancel" onClick={() => { setEditingPersonal(false); setSaveError(''); }}>Cancel</button>
                    {/* ✅ FIXED: now saves to API */}
                    <button className="btn-save" onClick={handleSavePersonal}>Save changes</button>
                  </div>
                </>
              )}
            </div>

            <div className="profile-card">
              <div className="profile-card-header">
                <span className="profile-card-title">🏪 Business Info</span>
                <button className="btn-outline" onClick={() => { setBizDraft({ ...biz }); setEditingBiz(true); }}>Edit</button>
              </div>
              {!editingBiz ? (
                <>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label className="field-label">Business name</label>
                    <div className="field-value">{biz.businessName || '—'}</div>
                  </div>
                  <div className="field-grid-2">
                    {[["KRA PIN", biz.kraPin], ["Business type", biz.bizType]].map(([label, val]) => (
                      <div className="field" key={label}>
                        <label className="field-label">{label}</label>
                        <div className="field-value">{val || '—'}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label className="field-label">Business name</label>
                    <input className="field-input" value={bizDraft.businessName} onChange={e => setBizDraft({ ...bizDraft, businessName: e.target.value })} />
                  </div>
                  <div className="field-grid-2" style={{ marginBottom: 12 }}>
                    <div className="field">
                      <label className="field-label">KRA PIN</label>
                      <input className="field-input" value={bizDraft.kraPin} onChange={e => setBizDraft({ ...bizDraft, kraPin: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="field-label">Business type</label>
                      <select className="field-select" value={bizDraft.bizType} onChange={e => setBizDraft({ ...bizDraft, bizType: e.target.value })}>
                        <option>Sole Proprietor</option>
                        <option>Partnership</option>
                        <option>Limited Company</option>
                      </select>
                    </div>
                  </div>
                  <div className="field-actions">
                    <button className="btn-cancel" onClick={() => setEditingBiz(false)}>Cancel</button>
                    {/* ✅ FIXED: now saves to API */}
                    <button className="btn-save" onClick={handleSaveBiz}>Save changes</button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="profile-card">
            <div className="profile-card-title" style={{ marginBottom: 16 }}>📦 Recent Orders</div>
            {ordersLoading ? (
              <p style={{ color: "#5a8a65", textAlign: "center" }}>⏳ Loading orders...</p>
            ) : realOrders.length === 0 ? (
              <div className="empty-state">
                <p>No orders yet.</p>
                <button onClick={() => navigate('/')}>Start Shopping</button>
              </div>
            ) : realOrders.map((order) => {
              const items = Array.isArray(order.items) ? order.items : [];
              const itemCount = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
              return (
                <div key={order._id} className="order-row">
                  <div className="order-icon">📦</div>
                  <div className="order-main">
                    <div className="order-id">#{order._id.slice(-8).toUpperCase()}</div>
                    <div className="order-items">
                      <span className="order-item-count">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                      {items.length > 0 && (
                        <> — {items.map(i => `${i.name} ×${i.quantity}`).join(', ')}</>
                      )}
                    </div>
                    <div className="order-date">{new Date(order.createdAt).toLocaleDateString('en-KE')}</div>
                  </div>
                  <div className="order-side">
                    <div className="order-amount">KSh {order.totalAmount?.toLocaleString()}</div>
                    <span className="order-status-pill" style={statusColors[order.status] || { background: "#1a2a4a", color: "#5a9ae6" }}>
                      {order.status}
                    </span>
                    <div className="order-track-btn">
                      <button onClick={() => navigate('/orders')}>Track</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ADDRESSES TAB */}
        {activeTab === "addresses" && (
          <>
            {isEditingAddress && (
              <div className="profile-card">
                <div className="profile-card-title" style={{ marginBottom: 12 }}>Address details</div>
                <div className="address-form-grid">
                  {[["Label", "title"], ["Address", "line1"], ["Area / City", "line2"], ["Country", "country"]].map(([label, field]) => (
                    <div className="field" key={field}>
                      <label className="field-label">{label}</label>
                      <input className="field-input" value={addressForm[field]} onChange={e => setAddressForm({ ...addressForm, [field]: e.target.value })} />
                    </div>
                  ))}
                  <label className="address-checkbox-row">
                    <input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })} /> Make default
                  </label>
                </div>
                <div className="field-actions">
                  <button className="btn-cancel" onClick={() => setIsEditingAddress(false)}>Cancel</button>
                  <button className="btn-save" onClick={saveAddress}>Save address</button>
                </div>
              </div>
            )}
            {addresses.length === 0 && !isEditingAddress && (
              <div className="empty-state"><p>No addresses saved yet.</p></div>
            )}
            {addresses.map(address => (
              <div key={address.id} className="address-card">
                {address.isDefault && <span className="address-default-badge">Default</span>}
                <div className="address-title">{address.title === 'Business' ? '🏪' : '🏠'} {address.title}</div>
                <div className="address-lines">{address.line1}<br />{address.line2}<br />{address.country}</div>
                <div className="address-actions">
                  <button className="btn-outline-muted" onClick={() => startEditAddress(address)}>Edit</button>
                  {!address.isDefault && <button className="btn-outline-muted" onClick={() => setDefaultAddress(address.id)}>Set default</button>}
                  <button className="btn-outline-danger" onClick={() => removeAddress(address.id)}>Remove</button>
                </div>
              </div>
            ))}
            <button className="add-address-btn" onClick={startAddAddress}>+ Add new address</button>
          </>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <>
            <div className="profile-card">
              <div className="profile-card-title" style={{ marginBottom: 4 }}>🔔 Notifications</div>
              {[
                { key: "orderUpdates", label: "Order updates", sub: "SMS and email for order status changes" },
                { key: "promotions", label: "Promotions & deals", sub: "Weekly offers and discounts" },
                { key: "restock", label: "Restock alerts", sub: "When wishlist items are back in stock" },
              ].map(({ key, label, sub }) => (
                <div key={key} className="settings-row">
                  <div>
                    <div className="settings-row-label">{label}</div>
                    <div className="settings-row-sub">{sub}</div>
                  </div>
                  <Toggle on={notifications[key]} onToggle={() => handleNotificationToggle(key)} />
                </div>
              ))}
              {settingsMessage && <div className="settings-message">{settingsMessage}</div>}
            </div>

            <div className="profile-card">
              <div className="profile-card-title" style={{ marginBottom: 4 }}>🔐 Security</div>
              <div className="settings-row" style={{ borderBottom: "none" }}>
                <div>
                  <div className="settings-row-label">Change password</div>
                  <div className="settings-row-sub">Update your account password</div>
                </div>
                <button className="btn-outline" onClick={handleTogglePasswordForm}>Update</button>
              </div>
            </div>

            {showPasswordForm && (
              <div className="profile-card">
                <div className="profile-card-title" style={{ marginBottom: 12 }}>New password</div>
                <div className="password-form-grid">
                  {[["Current password", "oldPassword"], ["New password", "newPassword"], ["Confirm new password", "confirmPassword"]].map(([placeholder, field]) => (
                    <input key={field} type="password" placeholder={placeholder} value={passwordForm[field]} onChange={e => setPasswordForm({ ...passwordForm, [field]: e.target.value })} />
                  ))}
                  <div className="field-actions">
                    <button className="btn-cancel" onClick={handleTogglePasswordForm}>Cancel</button>
                    <button className="btn-save" onClick={handleUpdatePassword}>Save password</button>
                  </div>
                </div>
              </div>
            )}

            <div className="profile-card">
              <div className="profile-card-title" style={{ marginBottom: 8 }}>⚠️ Account</div>
              <button className="btn-danger-block" onClick={handleSignOut}>🚪 Sign out</button>
              <button className="btn-danger-block" style={{ marginBottom: 0 }} onClick={handleDeleteAccount}>🗑️ Delete account</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}