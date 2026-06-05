import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingBiz, setEditingBiz] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [realOrders, setRealOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [personal, setPersonal] = useState({
    firstName: "Janet", lastName: "Mutheu",
    email: "", phone: "", accountType: "Retail",
  });
  const [personalDraft, setPersonalDraft] = useState({ ...personal });

  const [biz, setBiz] = useState({
    businessName: "Kamau General Store",
    kraPin: "A001234567P", bizType: "Sole Proprietor",
  });
  const [bizDraft, setBizDraft] = useState({ ...biz });

  const [notifications, setNotifications] = useState({
    orderUpdates: true, promotions: true, restock: false,
  });

  const [addresses, setAddresses] = useState([
    { id: 'home', title: 'Home', line1: '123 Moi Avenue, Apt 4B', line2: 'Nairobi CBD, Nairobi 00100', country: 'Kenya', isDefault: true },
    { id: 'business', title: 'Business', line1: 'Kamau General Store, Tom Mboya St', line2: 'Eastleigh, Nairobi 00600', country: 'Kenya', isDefault: false },
  ]);

  const [addressForm, setAddressForm] = useState({ id: '', title: '', line1: '', line2: '', country: 'Kenya', isDefault: false });
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (!user) return;
    const [firstName = '', ...rest] = (user.name || '').split(' ');
    const lastName = rest.join(' ');
    setPersonal(prev => ({ ...prev, firstName: firstName || prev.firstName, lastName: lastName || prev.lastName, email: user.email || prev.email, phone: user.phone || prev.phone }));
    setPersonalDraft(prev => ({ ...prev, firstName: firstName || prev.firstName, lastName: lastName || prev.lastName, email: user.email || prev.email, phone: user.phone || prev.phone }));
    if (user.notificationPreferences) setNotifications(user.notificationPreferences);
  }, [user]);

  useEffect(() => {
    if (activeTab !== 'orders') return;
    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const token = localStorage.getItem('cv-token');
        const res = await axios.get('http://localhost:5000/api/orders/my', {
          headers: { Authorization: `Bearer ${token}` }
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

  const statusColors = {
    'Delivered':        { background: "#0f3d1a", color: "#4aa85a" },
    'Processing Order': { background: "#3a2800", color: "#e6a817" },
    'Processing':       { background: "#3a2800", color: "#e6a817" },
    'Pending':          { background: "#3a2800", color: "#e6a817" },
    'Order Received':   { background: "#1a2a4a", color: "#5a9ae6" },
    'Payment Confirmed':{ background: "#1a2a4a", color: "#5a9ae6" },
    'Paid':             { background: "#1a2a4a", color: "#5a9ae6" },
    'Packed':           { background: "#2a1a4a", color: "#9a5ae6" },
    'Out for Delivery': { background: "#3a2800", color: "#e6a817" },
    'Cancelled':        { background: "#3a0f0f", color: "#e05a5a" },
  };

  const startAddAddress = () => { setAddressForm({ id: Date.now().toString(), title: '', line1: '', line2: '', country: 'Kenya', isDefault: false }); setIsEditingAddress(true); };
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
  const removeAddress = (id) => setAddresses(prev => { const next = prev.filter(a => a.id !== id); if (!next.some(a => a.isDefault) && next.length > 0) next[0].isDefault = true; return next; });

  const handleNotificationToggle = async (key) => {
    const nextValue = !notifications[key];
    const nextPrefs = { ...notifications, [key]: nextValue };
    setNotifications(nextPrefs);
    setNotificationSaving(true);
    setSettingsMessage('Saving...');
    try {
      const token = localStorage.getItem('cv-token');
      await axios.put('http://localhost:5000/api/users/notifications', nextPrefs, { headers: { Authorization: `Bearer ${token}` } });
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
  const handleDeleteAccount = () => { if (window.confirm('Delete account? This cannot be undone.')) { logout(); navigate('/login'); } };
  const handleTogglePasswordForm = () => { setShowPasswordForm(c => !c); setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); };
  const handleUpdatePassword = () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) { alert('Fill in all fields.'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { alert('Passwords do not match.'); return; }
    alert('Password updated!');
    setShowPasswordForm(false);
  };

  function Toggle({ on, onToggle }) {
    return (
      <div onClick={onToggle} style={{ width: 38, height: 20, background: on ? "#1d6b2a" : "#1a4a22", borderRadius: 99, position: "relative", cursor: "pointer", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 14, height: 14, background: "#4aa85a", borderRadius: "50%", transition: "left .2s" }} />
      </div>
    );
  }

  const initials = `${personal.firstName?.[0] || ''}${personal.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div style={{ background: "#0a1f0f", minHeight: "100vh", paddingBottom: 80, fontFamily: "sans-serif", color: "#c8e6cc" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d2a14, #1a4a22)", padding: "24px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #1a6b30, #2a8a45)", border: "3px solid #e6a817", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: "bold", color: "#e6a817", boxShadow: "0 4px 15px rgba(0,0,0,0.3)" }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {user?.name || `${personal.firstName} ${personal.lastName}`}
              <span style={{ background: "#e6a817", color: "#3a2500", fontSize: 10, padding: "2px 10px", borderRadius: 99, fontWeight: "bold" }}>
                {personal.accountType}
              </span>
            </div>
            <div style={{ color: "#7faa8a", fontSize: 12, marginTop: 4 }}>📍 Nairobi, Kenya · Member since Jan 2024</div>
            <div style={{ color: "#4aa85a", fontSize: 12, marginTop: 2 }}>✅ Verified account</div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
          {[
            [realOrders.length || '4', "Orders", "📦"],
            ["KES 48k", "Spent", "💰"],
            [addresses.length.toString(), "Addresses", "📍"]
          ].map(([n, l, icon]) => (
            <div key={l} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "10px 8px", textAlign: "center", border: "1px solid #1a4a22" }}>
              <div style={{ fontSize: 16 }}>{icon}</div>
              <div style={{ color: "#e6a817", fontSize: 18, fontWeight: "bold" }}>{n}</div>
              <div style={{ color: "#5a8a65", fontSize: 11 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1a4a22", overflowX: "auto" }}>
          {[
            { key: "info", label: "👤 Profile" },
            { key: "orders", label: "📦 Orders" },
            { key: "addresses", label: "📍 Addresses" },
            { key: "settings", label: "⚙️ Settings" },
          ].map(tab => (
            <div key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", color: activeTab === tab.key ? "#e6a817" : "#7faa8a", borderBottom: activeTab === tab.key ? "2px solid #e6a817" : "2px solid transparent", transition: "all 0.2s" }}>
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>

        {/* PROFILE TAB */}
        {activeTab === "info" && (
          <>
            <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>👤 Personal Info</span>
                <button onClick={() => { setPersonalDraft({ ...personal }); setEditingPersonal(true); }} style={{ background: "none", border: "1px solid #2a6a35", color: "#6daa7a", fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>Edit</button>
              </div>
              {!editingPersonal ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    {[["First name", personal.firstName], ["Last name", personal.lastName]].map(([label, val]) => (
                      <div key={label}><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>{label}</label><div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{val}</div></div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>Email</label><div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{personal.email}</div></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[["Phone", personal.phone], ["Account type", personal.accountType]].map(([label, val]) => (
                      <div key={label}><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>{label}</label><div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{val}</div></div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>First name</label><input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none", boxSizing: "border-box" }} value={personalDraft.firstName} onChange={e => setPersonalDraft({ ...personalDraft, firstName: e.target.value })} /></div>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>Last name</label><input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none", boxSizing: "border-box" }} value={personalDraft.lastName} onChange={e => setPersonalDraft({ ...personalDraft, lastName: e.target.value })} /></div>
                  </div>
                  <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>Email</label><input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none", boxSizing: "border-box" }} value={personalDraft.email} onChange={e => setPersonalDraft({ ...personalDraft, email: e.target.value })} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>Phone</label><input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none", boxSizing: "border-box" }} value={personalDraft.phone} onChange={e => setPersonalDraft({ ...personalDraft, phone: e.target.value })} /></div>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>Account type</label><select style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none", boxSizing: "border-box" }} value={personalDraft.accountType} onChange={e => setPersonalDraft({ ...personalDraft, accountType: e.target.value })}><option>Retail</option><option>Wholesale</option></select></div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setEditingPersonal(false)} style={{ background: "none", border: "1px solid #2a4a2e", color: "#7faa8a", fontSize: 13, padding: "7px 14px", borderRadius: 7, cursor: "pointer" }}>Cancel</button>
                    <button onClick={() => { setPersonal(personalDraft); setEditingPersonal(false); }} style={{ background: "#1d6b2a", border: "none", color: "#a8e6b4", fontSize: 13, padding: "7px 18px", borderRadius: 7, cursor: "pointer" }}>Save changes</button>
                  </div>
                </>
              )}
            </div>

            <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>🏪 Business Info</span>
                <button onClick={() => { setBizDraft({ ...biz }); setEditingBiz(true); }} style={{ background: "none", border: "1px solid #2a6a35", color: "#6daa7a", fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>Edit</button>
              </div>
              {!editingBiz ? (
                <>
                  <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>Business name</label><div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{biz.businessName}</div></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[["KRA PIN", biz.kraPin], ["Business type", biz.bizType]].map(([label, val]) => (
                      <div key={label}><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>{label}</label><div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{val}</div></div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>Business name</label><input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none", boxSizing: "border-box" }} value={bizDraft.businessName} onChange={e => setBizDraft({ ...bizDraft, businessName: e.target.value })} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>KRA PIN</label><input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none", boxSizing: "border-box" }} value={bizDraft.kraPin} onChange={e => setBizDraft({ ...bizDraft, kraPin: e.target.value })} /></div>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>Business type</label><select style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none", boxSizing: "border-box" }} value={bizDraft.bizType} onChange={e => setBizDraft({ ...bizDraft, bizType: e.target.value })}><option>Sole Proprietor</option><option>Partnership</option><option>Limited Company</option></select></div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setEditingBiz(false)} style={{ background: "none", border: "1px solid #2a4a2e", color: "#7faa8a", fontSize: 13, padding: "7px 14px", borderRadius: 7, cursor: "pointer" }}>Cancel</button>
                    <button onClick={() => { setBiz(bizDraft); setEditingBiz(false); }} style={{ background: "#1d6b2a", border: "none", color: "#a8e6b4", fontSize: 13, padding: "7px 18px", borderRadius: 7, cursor: "pointer" }}>Save changes</button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ORDERS TAB — real data */}
        {activeTab === "orders" && (
          <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18 }}>
            <div style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase", marginBottom: 16, letterSpacing: 1 }}>📦 Recent Orders</div>
            {ordersLoading ? (
              <p style={{ color: "#5a8a65", textAlign: "center" }}>⏳ Loading orders...</p>
            ) : realOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <p style={{ color: "#5a8a65" }}>No orders yet.</p>
                <button onClick={() => navigate('/')} style={{ marginTop: 10, background: "#1d6b2a", border: "none", color: "#a8e6b4", fontSize: 13, padding: "8px 20px", borderRadius: 7, cursor: "pointer" }}>Start Shopping</button>
              </div>
            ) : realOrders.map((order, i) => (
              <div key={order._id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i === realOrders.length - 1 ? "none" : "1px solid #12320a" }}>
                <div style={{ width: 40, height: 40, background: "#112a15", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📦</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#c8e6cc", fontSize: 13, fontWeight: "bold" }}>#{order._id.slice(-8).toUpperCase()}</div>
                  <div style={{ color: "#5a8a65", fontSize: 12, marginTop: 2 }}>{order.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}</div>
                  <div style={{ color: "#5a8a65", fontSize: 11, marginTop: 2 }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ color: "#e6a817", fontSize: 13, fontWeight: "bold" }}>KSh {order.totalAmount?.toLocaleString()}</div>
                  <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, fontWeight: "bold", display: "inline-block", marginTop: 4, ...(statusColors[order.status] || { background: "#1a2a4a", color: "#5a9ae6" }) }}>{order.status}</span>
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => navigate(`/orders`)} style={{ background: "none", border: "1px solid #1a4a22", color: "#4aa85a", fontSize: 11, padding: "3px 8px", borderRadius: 5, cursor: "pointer" }}>Track</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADDRESSES TAB */}
        {activeTab === "addresses" && (
          <>
            {isEditingAddress && (
              <div style={{ background: "#071510", border: "1px solid #1a4a22", borderRadius: 12, padding: 18, marginBottom: 12 }}>
                <div style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase", marginBottom: 12 }}>Address details</div>
                <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                  {[["Label", "title"], ["Address", "line1"], ["Area / City", "line2"], ["Country", "country"]].map(([label, field]) => (
                    <div key={field}><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 3 }}>{label}</label><input style={{ width: "100%", color: "#c8e6cc", background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", outline: "none", boxSizing: "border-box" }} value={addressForm[field]} onChange={e => setAddressForm({ ...addressForm, [field]: e.target.value })} /></div>
                  ))}
                  <label style={{ fontSize: 12, color: "#5a8a65", display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })} /> Make default</label>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setIsEditingAddress(false)} style={{ background: "none", border: "1px solid #2a4a2e", color: "#7faa8a", fontSize: 13, padding: "7px 14px", borderRadius: 7, cursor: "pointer" }}>Cancel</button>
                  <button onClick={saveAddress} style={{ background: "#1d6b2a", border: "none", color: "#a8e6b4", fontSize: 13, padding: "7px 14px", borderRadius: 7, cursor: "pointer" }}>Save address</button>
                </div>
              </div>
            )}
            {addresses.map(address => (
              <div key={address.id} style={{ background: "#071510", border: "1px solid #1a4a22", borderRadius: 8, padding: 14, marginBottom: 10, position: "relative" }}>
                {address.isDefault && <span style={{ position: "absolute", top: 10, right: 10, background: "#1d4a22", color: "#4aa85a", fontSize: 10, padding: "2px 8px", borderRadius: 99 }}>Default</span>}
                <div style={{ color: "#c8e6cc", fontSize: 14, fontWeight: "bold" }}>{address.title === 'Business' ? '🏪' : '🏠'} {address.title}</div>
                <div style={{ color: "#7faa8a", fontSize: 12, marginTop: 6, lineHeight: 1.7 }}>{address.line1}<br />{address.line2}<br />{address.country}</div>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button onClick={() => startEditAddress(address)} style={{ background: "none", border: "1px solid #1a4a22", color: "#5a8a65", fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>Edit</button>
                  {!address.isDefault && <button onClick={() => setDefaultAddress(address.id)} style={{ background: "none", border: "1px solid #1a4a22", color: "#5a8a65", fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>Set default</button>}
                  <button onClick={() => removeAddress(address.id)} style={{ background: "none", border: "1px solid #3a1a1a", color: "#e05a5a", fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>Remove</button>
                </div>
              </div>
            ))}
            <button onClick={startAddAddress} style={{ border: "1px dashed #1a5a22", background: "none", color: "#4aa85a", fontSize: 13, width: "100%", padding: 12, borderRadius: 8, cursor: "pointer" }}>+ Add new address</button>
          </>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <>
            <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18, marginBottom: 12 }}>
              <div style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase", marginBottom: 4, letterSpacing: 1 }}>🔔 Notifications</div>
              {[
                { key: "orderUpdates", label: "Order updates", sub: "SMS and email for order status changes" },
                { key: "promotions", label: "Promotions & deals", sub: "Weekly offers and discounts" },
                { key: "restock", label: "Restock alerts", sub: "When wishlist items are back in stock" },
              ].map(({ key, label, sub }) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #12320a" }}>
                  <div><div style={{ color: "#c8e6cc", fontSize: 13 }}>{label}</div><div style={{ color: "#5a8a65", fontSize: 11, marginTop: 2 }}>{sub}</div></div>
                  <Toggle on={notifications[key]} onToggle={() => handleNotificationToggle(key)} />
                </div>
              ))}
              {settingsMessage && <div style={{ color: "#a8e6b4", fontSize: 12, marginTop: 8 }}>{settingsMessage}</div>}
            </div>

            <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18, marginBottom: 12 }}>
              <div style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase", marginBottom: 4, letterSpacing: 1 }}>🔐 Security</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
                <div><div style={{ color: "#c8e6cc", fontSize: 13 }}>Change password</div><div style={{ color: "#5a8a65", fontSize: 11, marginTop: 2 }}>Last changed 3 months ago</div></div>
                <button onClick={handleTogglePasswordForm} style={{ background: "none", border: "1px solid #2a6a35", color: "#6daa7a", fontSize: 12, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>Update</button>
              </div>
            </div>

            {showPasswordForm && (
              <div style={{ background: "#071510", border: "1px solid #12320a", borderRadius: 12, padding: 18, marginBottom: 12 }}>
                <div style={{ marginBottom: 12, color: "#7faa8a", fontSize: 12, textTransform: "uppercase" }}>New password</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {[["Current password", "oldPassword"], ["New password", "newPassword"], ["Confirm new password", "confirmPassword"]].map(([placeholder, field]) => (
                    <input key={field} type="password" placeholder={placeholder} value={passwordForm[field]} onChange={e => setPasswordForm({ ...passwordForm, [field]: e.target.value })} style={{ width: "100%", background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "10px", color: "#c8e6cc", outline: "none", boxSizing: "border-box" }} />
                  ))}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={handleTogglePasswordForm} style={{ background: "none", border: "1px solid #2a4a2e", color: "#7faa8a", fontSize: 13, padding: "7px 14px", borderRadius: 7, cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleUpdatePassword} style={{ background: "#1d6b2a", border: "none", color: "#a8e6b4", fontSize: 13, padding: "7px 14px", borderRadius: 7, cursor: "pointer" }}>Save password</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18 }}>
              <div style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase", marginBottom: 8, letterSpacing: 1 }}>⚠️ Account</div>
              <button onClick={handleSignOut} style={{ background: "none", border: "1px solid #5a1a1a", color: "#e05a5a", fontSize: 13, padding: "10px 16px", borderRadius: 7, cursor: "pointer", width: "100%", marginBottom: 8 }}>🚪 Sign out</button>
              <button onClick={handleDeleteAccount} style={{ background: "none", border: "1px solid #5a1a1a", color: "#e05a5a", fontSize: 13, padding: "10px 16px", borderRadius: 7, cursor: "pointer", width: "100%" }}>🗑️ Delete account</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}