import { useState } from "react";

export default function Profile() {
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingBiz, setEditingBiz] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [personal, setPersonal] = useState({
    firstName: "Jane",
    lastName: "Kamau",
    email: "jane.kamau@email.com",
    phone: "+254 712 345 678",
    accountType: "Retail",
  });
  const [personalDraft, setPersonalDraft] = useState({ ...personal });

  const [biz, setBiz] = useState({
    businessName: "Kamau General Store",
    kraPin: "A001234567P",
    bizType: "Sole Proprietor",
  });
  const [bizDraft, setBizDraft] = useState({ ...biz });

  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: true,
    restock: false,
  });

  function toggleNotif(key) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const orders = [
    { id: "ORD-20240528-001", items: "Sugar 50kg × 2, Cooking Oil 20L × 1", date: "28 May 2026", amount: "KES 12,400", status: "Processing" },
    { id: "ORD-20240520-008", items: "Rice 25kg × 4, Wheat Flour 2kg × 10",  date: "20 May 2026", amount: "KES 8,750",  status: "Delivered"  },
    { id: "ORD-20240512-003", items: "Beverages assorted × 24",               date: "12 May 2026", amount: "KES 5,200",  status: "Delivered"  },
    { id: "ORD-20240430-011", items: "Cleaning Products bundle × 3",           date: "30 Apr 2026", amount: "KES 3,600",  status: "Cancelled"  },
  ];

  const statusColors = {
    Delivered:  { background: "#0f3d1a", color: "#4aa85a" },
    Processing: { background: "#3a2800", color: "#e6a817" },
    Cancelled:  { background: "#3a0f0f", color: "#e05a5a" },
  };

  function Toggle({ on, onToggle }) {
    return (
      <div onClick={onToggle} style={{ width: 38, height: 20, background: on ? "#1d6b2a" : "#1a4a22", borderRadius: 99, position: "relative", cursor: "pointer", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 14, height: 14, background: "#4aa85a", borderRadius: "50%", transition: "left .2s" }} />
      </div>
    );
  }

  return (
    <div style={{ background: "#0a1f0f", minHeight: "100vh", paddingBottom: 80, fontFamily: "sans-serif", color: "#c8e6cc" }}>

      {/* Header */}
      <div style={{ background: "#0d2a14", padding: "24px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#1a6b30", border: "3px solid #e6a817", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: "bold", color: "#e6a817" }}>
            JK
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#fff" }}>
              {personal.firstName} {personal.lastName}
              <span style={{ background: "#e6a817", color: "#3a2500", fontSize: 10, padding: "2px 8px", borderRadius: 99, marginLeft: 8, fontWeight: "bold" }}>
                {personal.accountType}
              </span>
            </div>
            <div style={{ color: "#7faa8a", fontSize: 12, marginTop: 4 }}>Member since Jan 2024 · Nairobi, Kenya</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1a4a22", marginTop: 16, overflowX: "auto" }}>
          {[
            { key: "info",      label: "Profile"   },
            { key: "orders",    label: "Orders"    },
            { key: "addresses", label: "Addresses" },
            { key: "settings",  label: "Settings"  },
          ].map((tab) => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", color: activeTab === tab.key ? "#e6a817" : "#7faa8a", borderBottom: activeTab === tab.key ? "2px solid #e6a817" : "2px solid transparent" }}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 20 }}>

        {/* ── PROFILE TAB ── */}
        {activeTab === "info" && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
              {[["24","Orders"],["KES 48k","Spent"],["3","Addresses"]].map(([n,l]) => (
                <div key={l} style={{ background: "#071510", border: "1px solid #1a4a22", borderRadius: 8, padding: 12, textAlign: "center" }}>
                  <div style={{ color: "#e6a817", fontSize: 20, fontWeight: "bold" }}>{n}</div>
                  <div style={{ color: "#5a8a65", fontSize: 11, marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Personal info card */}
            <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase" }}>Personal info</span>
                <button onClick={() => { setPersonalDraft({...personal}); setEditingPersonal(true); }} style={{ background: "none", border: "1px solid #2a6a35", color: "#6daa7a", fontSize: 12, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>Edit</button>
              </div>

              {!editingPersonal ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>First name</label><div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{personal.firstName}</div></div>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Last name</label><div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{personal.lastName}</div></div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Email</label>
                    <div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{personal.email}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Phone</label><div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{personal.phone}</div></div>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Account type</label><div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{personal.accountType}</div></div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>First name</label><input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none" }} value={personalDraft.firstName} onChange={e => setPersonalDraft({...personalDraft, firstName: e.target.value})} /></div>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Last name</label><input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none" }} value={personalDraft.lastName} onChange={e => setPersonalDraft({...personalDraft, lastName: e.target.value})} /></div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Email</label>
                    <input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none" }} value={personalDraft.email} onChange={e => setPersonalDraft({...personalDraft, email: e.target.value})} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Phone</label><input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none" }} value={personalDraft.phone} onChange={e => setPersonalDraft({...personalDraft, phone: e.target.value})} /></div>
                    <div>
                      <label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Account type</label>
                      <select style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none" }} value={personalDraft.accountType} onChange={e => setPersonalDraft({...personalDraft, accountType: e.target.value})}>
                        <option>Retail</option>
                        <option>Wholesale</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setEditingPersonal(false)} style={{ background: "none", border: "1px solid #2a4a2e", color: "#7faa8a", fontSize: 13, padding: "7px 14px", borderRadius: 7, cursor: "pointer" }}>Cancel</button>
                    <button onClick={() => { setPersonal(personalDraft); setEditingPersonal(false); }} style={{ background: "#1d6b2a", border: "none", color: "#a8e6b4", fontSize: 13, padding: "7px 18px", borderRadius: 7, cursor: "pointer" }}>Save changes</button>
                  </div>
                </>
              )}
            </div>

            {/* Business info card */}
            <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase" }}>Business info</span>
                <button onClick={() => { setBizDraft({...biz}); setEditingBiz(true); }} style={{ background: "none", border: "1px solid #2a6a35", color: "#6daa7a", fontSize: 12, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>Edit</button>
              </div>

              {!editingBiz ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Business name</label>
                    <div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{biz.businessName}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>KRA PIN</label><div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{biz.kraPin}</div></div>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Business type</label><div style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #1a4a22", borderRadius: 6, padding: "8px 10px" }}>{biz.bizType}</div></div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Business name</label>
                    <input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none" }} value={bizDraft.businessName} onChange={e => setBizDraft({...bizDraft, businessName: e.target.value})} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div><label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>KRA PIN</label><input style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none" }} value={bizDraft.kraPin} onChange={e => setBizDraft({...bizDraft, kraPin: e.target.value})} /></div>
                    <div>
                      <label style={{ fontSize: 11, color: "#5a8a65", display: "block", marginBottom: 4 }}>Business type</label>
                      <select style={{ color: "#c8e6cc", fontSize: 14, background: "#071510", border: "1px solid #2a7a3a", borderRadius: 6, padding: "8px 10px", width: "100%", outline: "none" }} value={bizDraft.bizType} onChange={e => setBizDraft({...bizDraft, bizType: e.target.value})}>
                        <option>Sole Proprietor</option>
                        <option>Partnership</option>
                        <option>Limited Company</option>
                      </select>
                    </div>
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

        {/* ── ORDERS TAB ── */}
        {activeTab === "orders" && (
          <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18 }}>
            <div style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase", marginBottom: 16 }}>Recent orders</div>
            {orders.map((order, i) => (
              <div key={order.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i === orders.length - 1 ? "none" : "1px solid #12320a" }}>
                <div style={{ width: 38, height: 38, background: "#112a15", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#c8e6cc", fontSize: 13, fontWeight: "bold" }}>{order.id}</div>
                  <div style={{ color: "#5a8a65", fontSize: 12, marginTop: 2 }}>{order.items}</div>
                  <div style={{ color: "#5a8a65", fontSize: 12 }}>{order.date}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#c8e6cc", fontSize: 13, fontWeight: "bold" }}>{order.amount}</div>
                  <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, fontWeight: "bold", display: "inline-block", marginTop: 4, ...statusColors[order.status] }}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ADDRESSES TAB ── */}
        {activeTab === "addresses" && (
          <>
            <div style={{ background: "#071510", border: "1px solid #1a4a22", borderRadius: 8, padding: 12, marginBottom: 10, position: "relative" }}>
              <span style={{ position: "absolute", top: 10, right: 10, background: "#1d4a22", color: "#4aa85a", fontSize: 10, padding: "2px 7px", borderRadius: 99 }}>Default</span>
              <div style={{ color: "#c8e6cc", fontSize: 13, fontWeight: "bold" }}>🏠 Home</div>
              <div style={{ color: "#7faa8a", fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>123 Moi Avenue, Apt 4B<br/>Nairobi CBD, Nairobi 00100<br/>Kenya</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button style={{ background: "none", border: "1px solid #1a4a22", color: "#5a8a65", fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>Edit</button>
                <button style={{ background: "none", border: "1px solid #1a4a22", color: "#5a8a65", fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>Set default</button>
              </div>
            </div>

            <div style={{ background: "#071510", border: "1px solid #1a4a22", borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div style={{ color: "#c8e6cc", fontSize: 13, fontWeight: "bold" }}>🏪 Business</div>
              <div style={{ color: "#7faa8a", fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>Kamau General Store, Tom Mboya St<br/>Eastleigh, Nairobi 00600<br/>Kenya</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button style={{ background: "none", border: "1px solid #1a4a22", color: "#5a8a65", fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>Edit</button>
                <button style={{ background: "none", border: "1px solid #1a4a22", color: "#5a8a65", fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>Set default</button>
                <button style={{ background: "none", border: "1px solid #3a1a1a", color: "#e05a5a", fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>Remove</button>
              </div>
            </div>

            <button style={{ border: "1px dashed #1a5a22", background: "none", color: "#4aa85a", fontSize: 13, width: "100%", padding: 12, borderRadius: 8, cursor: "pointer" }}>
              + Add new address
            </button>
          </>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && (
          <>
            <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase", marginBottom: 4 }}>Notifications</div>
              {[
                { key: "orderUpdates", label: "Order updates",      sub: "SMS and email for order status changes" },
                { key: "promotions",   label: "Promotions & deals", sub: "Weekly offers and discounts" },
                { key: "restock",      label: "Restock alerts",     sub: "When wishlist items are back in stock" },
              ].map(({ key, label, sub }) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #12320a" }}>
                  <div>
                    <div style={{ color: "#c8e6cc", fontSize: 13 }}>{label}</div>
                    <div style={{ color: "#5a8a65", fontSize: 11, marginTop: 2 }}>{sub}</div>
                  </div>
                  <Toggle on={notifications[key]} onToggle={() => toggleNotif(key)} />
                </div>
              ))}
            </div>

            <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase", marginBottom: 4 }}>Security</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
                <div>
                  <div style={{ color: "#c8e6cc", fontSize: 13 }}>Change password</div>
                  <div style={{ color: "#5a8a65", fontSize: 11, marginTop: 2 }}>Last changed 3 months ago</div>
                </div>
                <button style={{ background: "none", border: "1px solid #2a6a35", color: "#6daa7a", fontSize: 12, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>Update</button>
              </div>
            </div>

            <div style={{ background: "#0d2a14", border: "1px solid #1a4a22", borderRadius: 12, padding: 18 }}>
              <div style={{ color: "#7faa8a", fontSize: 12, textTransform: "uppercase", marginBottom: 4 }}>Account</div>
              <button style={{ background: "none", border: "1px solid #5a1a1a", color: "#e05a5a", fontSize: 13, padding: "8px 16px", borderRadius: 7, cursor: "pointer", width: "100%", marginTop: 8 }}>Sign out</button>
              <button style={{ background: "none", border: "1px solid #5a1a1a", color: "#e05a5a", fontSize: 13, padding: "8px 16px", borderRadius: 7, cursor: "pointer", width: "100%", marginTop: 8 }}>Delete account</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}