import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API   = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GREEN = '#1a7a4a';

// ─── Password strength checker ─────────────────────────────────────────────
function checkStrength(pw) {
  return {
    length:    pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number:    /\d/.test(pw),
    special:   /[@$!%*?&#^()_\-+=<>]/.test(pw),
  };
}

function StrengthBar({ password }) {
  const rules = checkStrength(password);
  const score = Object.values(rules).filter(Boolean).length;
  const colors = ['#e53e3e', '#e53e3e', '#ed8936', '#ecc94b', '#48bb78', '#1a7a4a'];
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  if (!password) return null;
  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: i <= score ? colors[score] : '#e2e8f0',
            transition: 'background .3s',
          }} />
        ))}
      </div>
      <p style={{ fontSize: '12px', color: colors[score], fontWeight: 600, margin: 0 }}>{labels[score]}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
        {[
          ['8+ characters', rules.length],
          ['Uppercase',     rules.uppercase],
          ['Lowercase',     rules.lowercase],
          ['Number',        rules.number],
          ['Special char',  rules.special],
        ].map(([label, ok]) => (
          <span key={label} style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500,
            background: ok ? '#f0faf5' : '#f7fafc',
            color:      ok ? GREEN     : '#718096',
            border:     `1px solid ${ok ? '#9ae6b4' : '#e2e8f0'}`,
          }}>
            {ok ? '✓' : '○'} {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Change Password Card ──────────────────────────────────────────────────
function ChangePasswordCard() {
  const [form, setForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow]     = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess('');

    const rules = checkStrength(form.newPassword);
    if (!Object.values(rules).every(Boolean)) {
      setError('Password does not meet all requirements.'); return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.'); return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${API}/api/security/change-password`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setSuccess('Password changed successfully. A confirmation was sent to your email.');
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const Eye = ({ field }) => (
    <button type="button" onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '16px' }}>
      {show[field] ? '🙈' : '👁️'}
    </button>
  );

  return (
    <div style={card}>
      <div style={cardHeader}>
        <span style={{ fontSize: '20px' }}>🔑</span>
        <div>
          <h3 style={cardTitle}>Change Password</h3>
          <p style={cardSub}>Update your account password. We'll notify you by email and SMS.</p>
        </div>
      </div>

      {error   && <div style={errBox}>{error}</div>}
      {success && <div style={okBox}>{success}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { name: 'currentPassword', label: 'Current Password', field: 'current' },
          { name: 'newPassword',     label: 'New Password',     field: 'new'     },
          { name: 'confirmPassword', label: 'Confirm New Password', field: 'confirm' },
        ].map(({ name, label, field }) => (
          <div key={name}>
            <label style={lbl}>{label}</label>
            <div style={{ position: 'relative' }}>
              <input
                name={name}
                type={show[field] ? 'text' : 'password'}
                value={form[name]}
                onChange={handleChange}
                required
                style={{ ...inp, paddingRight: '44px' }}
                placeholder={`Enter ${label.toLowerCase()}`}
              />
              <Eye field={field} />
            </div>
            {name === 'newPassword' && <StrengthBar password={form.newPassword} />}
          </div>
        ))}

        <button type="submit" disabled={loading} style={{ ...submitBtn, opacity: loading ? 0.7 : 1 }}>
          {loading ? '⏳ Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

// ─── Activity Log Card ─────────────────────────────────────────────────────
const EVENT_LABELS = {
  LOGIN_SUCCESS:    { label: 'Login',            icon: '✅', color: '#276749' },
  LOGIN_FAILURE:    { label: 'Failed Login',      icon: '❌', color: '#c53030' },
  OTP_SENT:         { label: 'Code Sent',         icon: '📨', color: '#2b6cb0' },
  OTP_VERIFIED:     { label: 'Code Verified',     icon: '✔️', color: '#276749' },
  OTP_FAILED:       { label: 'Wrong Code',        icon: '⚠️', color: '#c05621' },
  OTP_EXPIRED:      { label: 'Code Expired',      icon: '⏰', color: '#718096' },
  PASSWORD_CHANGED: { label: 'Password Changed',  icon: '🔑', color: '#553c9a' },
  DEVICE_TRUSTED:   { label: 'Device Trusted',    icon: '📱', color: '#2c7a7b' },
  ACCOUNT_LOCKED:   { label: 'Account Locked',    icon: '🔒', color: '#c53030' },
  FORCE_LOGOUT:     { label: 'Force Logged Out',  icon: '🚪', color: '#c53030' },
  ACCOUNT_DISABLED: { label: 'Account Disabled',  icon: '🚫', color: '#c53030' },
};

function ActivityLog() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API}/api/security/logs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setLogs(data.logs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={card}>
      <div style={cardHeader}><span style={{ fontSize: '20px' }}>📋</span><div><h3 style={cardTitle}>Activity Log</h3></div></div>
      {[...Array(4)].map((_, i) => <div key={i} style={skeletonRow} />)}
    </div>
  );

  return (
    <div style={card}>
      <div style={cardHeader}>
        <span style={{ fontSize: '20px' }}>📋</span>
        <div>
          <h3 style={cardTitle}>Activity Log</h3>
          <p style={cardSub}>Recent security events on your account.</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '24px' }}>No activity recorded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {logs.map(log => {
            const meta = EVENT_LABELS[log.event] || { label: log.event, icon: '•', color: '#555' };
            const d    = new Date(log.createdAt);
            return (
              <div key={log._id} style={logRow}>
                <div style={logIcon}>{meta.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ fontWeight: 600, color: meta.color, fontSize: '14px' }}>{meta.label}</span>
                    <span style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>
                      {d.toLocaleDateString('en-KE')} {d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {log.browser && <span>🌐 {log.browser}</span>}
                    {log.os      && <span>💻 {log.os}</span>}
                    {log.device  && <span>📱 {log.device}</span>}
                    {log.ipAddress && <span>📍 {log.ipAddress}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Trusted Devices Card ──────────────────────────────────────────────────
function TrustedDevices() {
  const [devices, setDevices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [removing, setRemoving] = useState(null);

  const load = () => {
    const token = localStorage.getItem('token');
    axios.get(`${API}/api/security/trusted-devices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setDevices(data.devices || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async id => {
    setRemoving(id);
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/api/security/trusted-devices/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setDevices(d => d.filter(x => x._id !== id));
    } catch (e) {
      alert('Failed to remove device.');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div style={card}>
      <div style={cardHeader}>
        <span style={{ fontSize: '20px' }}>📱</span>
        <div>
          <h3 style={cardTitle}>Trusted Devices</h3>
          <p style={cardSub}>Devices that skip two-step verification for 30 days.</p>
        </div>
      </div>

      {loading ? <div style={skeletonRow} /> : devices.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>No trusted devices yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {devices.map(d => (
            <div key={d._id} style={deviceRow}>
              <div style={{ fontSize: '24px' }}>{d.device === 'Mobile' ? '📱' : d.device === 'Tablet' ? '📟' : '💻'}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#333' }}>
                  {d.browser} on {d.os}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#718096' }}>
                  Added {new Date(d.createdAt).toLocaleDateString('en-KE')} · Expires {new Date(d.expiresAt).toLocaleDateString('en-KE')}
                </p>
              </div>
              <button onClick={() => remove(d._id)} disabled={removing === d._id} style={removeBtn}>
                {removing === d._id ? '…' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main SecuritySection ──────────────────────────────────────────────────
export default function SecuritySection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '680px' }}>
      <ChangePasswordCard />
      <TrustedDevices />
      <ActivityLog />
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────
const card        = { background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e8ecef', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' };
const cardHeader  = { display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '20px' };
const cardTitle   = { margin: '0 0 4px', fontSize: '17px', fontWeight: 700, color: '#1a202c' };
const cardSub     = { margin: 0, fontSize: '13px', color: '#718096' };
const lbl         = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '6px' };
const inp         = { width: '100%', padding: '11px 14px', border: '1.5px solid #d0d5dd', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', outline: 'none' };
const submitBtn   = { padding: '13px', background: GREEN, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' };
const errBox      = { background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', marginBottom: '12px' };
const okBox       = { background: '#f0faf5', border: '1px solid #9ae6b4', color: '#276749', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', marginBottom: '12px' };
const logRow      = { display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f0f0f0', alignItems: 'flex-start' };
const logIcon     = { width: '32px', height: '32px', background: '#f7f7f7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 };
const deviceRow   = { display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e8ecef' };
const removeBtn   = { padding: '6px 12px', background: '#fff', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' };
const skeletonRow = { height: '52px', background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', borderRadius: '8px', marginBottom: '10px', animation: 'shimmer 1.5s infinite' };