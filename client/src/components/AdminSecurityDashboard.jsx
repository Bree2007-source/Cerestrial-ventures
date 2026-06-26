import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API   = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GREEN = '#1a7a4a';

const EVENT_COLORS = {
  LOGIN_SUCCESS:    '#276749', LOGIN_FAILURE: '#c53030',
  OTP_FAILED:       '#c05621', ACCOUNT_LOCKED: '#c53030',
  PASSWORD_CHANGED: '#553c9a', DEVICE_TRUSTED: '#2c7a7b',
  OTP_SENT:         '#2b6cb0', OTP_VERIFIED:   '#276749',
};

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8ecef', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ width: '48px', height: '48px', background: `${color}18`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontSize: '13px', color: '#718096' }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: '26px', fontWeight: 700, color }}>{value}</p>
      </div>
    </div>
  );
}

export default function AdminSecurityDashboard() {
  const [summary, setSummary]   = useState(null);
  const [logs, setLogs]         = useState([]);
  const [filter, setFilter]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const token = localStorage.getItem('token');
  const hdr   = { Authorization: `Bearer ${token}` };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        axios.get(`${API}/api/security/admin/summary`,      { headers: hdr }),
        axios.get(`${API}/api/security/admin/logs?limit=60`, { headers: hdr }),
      ]);
      setSummary(s.data.summary);
      setLogs(l.data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const forceLogout = async userId => {
    if (!window.confirm('Force logout this user?')) return;
    try {
      await axios.post(`${API}/api/security/admin/force-logout/${userId}`, {}, { headers: hdr });
      setActionMsg('User has been logged out.');
      setTimeout(() => setActionMsg(''), 3000);
    } catch { alert('Failed.'); }
  };

  const toggleDisable = async (userId, currentlyDisabled) => {
    const action  = currentlyDisabled ? 'enable' : 'disable';
    const reason  = currentlyDisabled ? '' : (window.prompt('Reason for disabling:') || 'Admin action');
    if (!currentlyDisabled && !reason) return;
    try {
      await axios.patch(`${API}/api/security/admin/disable/${userId}`, { disable: !currentlyDisabled, reason }, { headers: hdr });
      setActionMsg(`Account ${action}d.`);
      loadAll();
      setTimeout(() => setActionMsg(''), 3000);
    } catch { alert('Failed.'); }
  };

  const filtered = filter ? logs.filter(l => l.event === filter) : logs;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>Loading security data…</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 700, color: '#1a202c' }}>🛡️ Security Dashboard</h2>
      <p style={{ margin: '0 0 28px', color: '#718096', fontSize: '14px' }}>Last 24 hours activity overview</p>

      {actionMsg && <div style={{ background: '#f0faf5', border: '1px solid #9ae6b4', color: '#276749', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontWeight: 600 }}>{actionMsg}</div>}

      {/* Stats */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          <StatCard icon="✅" label="Successful Logins"  value={summary.loginSuccesses}  color={GREEN} />
          <StatCard icon="❌" label="Failed Logins"       value={summary.loginFailures}   color="#c53030" />
          <StatCard icon="⚠️" label="Failed OTP Attempts" value={summary.otpFailures}     color="#c05621" />
          <StatCard icon="🔒" label="Account Lockouts"    value={summary.accountLockouts} color="#744210" />
          <StatCard icon="🔑" label="Password Changes"    value={summary.passwordChanges} color="#553c9a" />
        </div>
      )}

      {/* Suspicious IPs */}
      {summary?.suspiciousIps?.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #f6e05e', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 10px', color: '#744210' }}>⚠️ Suspicious IP Addresses (3+ failures)</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {summary.suspiciousIps.map(ip => (
              <span key={ip._id} style={{ background: '#fefcbf', border: '1px solid #f6e05e', borderRadius: '20px', padding: '4px 12px', fontSize: '13px', fontWeight: 600, color: '#744210' }}>
                {ip._id} — {ip.count} attempts
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Logs table */}
      <div style={{ background: '#fff', border: '1px solid #e8ecef', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a202c' }}>Security Event Log</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={filter} onChange={e => setFilter(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #d0d5dd', borderRadius: '7px', fontSize: '13px', outline: 'none' }}>
              <option value="">All Events</option>
              {['LOGIN_SUCCESS','LOGIN_FAILURE','OTP_SENT','OTP_VERIFIED','OTP_FAILED','OTP_EXPIRED','PASSWORD_CHANGED','DEVICE_TRUSTED','ACCOUNT_LOCKED','FORCE_LOGOUT','ACCOUNT_DISABLED']
                .map(e => <option key={e} value={e}>{e.replace(/_/g,' ')}</option>)}
            </select>
            <button onClick={loadAll} style={{ padding: '7px 14px', background: GREEN, color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>↺ Refresh</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Event','User','Date & Time','Browser','OS','Device','IP','Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#4a5568', borderBottom: '1px solid #e8ecef', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>No events found.</td></tr>
              ) : filtered.map(log => {
                const d   = new Date(log.createdAt);
                const clr = EVENT_COLORS[log.event] || '#555';
                return (
                  <tr key={log._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: `${clr}15`, color: clr, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {log.event.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#333', whiteSpace: 'nowrap' }}>
                      {log.userId?.name || '—'}<br/>
                      <span style={{ color: '#aaa', fontSize: '11px' }}>{log.userId?.email || ''}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#555', whiteSpace: 'nowrap' }}>
                      {d.toLocaleDateString('en-KE')}<br/>
                      <span style={{ color: '#aaa', fontSize: '11px' }}>{d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#555' }}>{log.browser || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#555' }}>{log.os     || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#555' }}>{log.device || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#555', fontFamily: 'monospace', fontSize: '12px' }}>{log.ipAddress || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {log.userId?._id && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                          <button onClick={() => forceLogout(log.userId._id)}
                            style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: '5px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Force Out
                          </button>
                          <button onClick={() => toggleDisable(log.userId._id, log.userId.isDisabled)}
                            style={{ padding: '4px 8px', background: '#fff', border: '1px solid #c05621', color: '#c05621', borderRadius: '5px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                            {log.userId.isDisabled ? 'Enable' : 'Disable'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}