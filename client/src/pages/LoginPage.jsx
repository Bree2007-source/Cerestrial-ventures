import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [activeTab, setActiveTab]       = useState('login');
  const [loginData, setLoginData]       = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [driverData, setDriverData]     = useState({ email: '', password: '' });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const navigate = useNavigate();
  const { login, register, loginDriver, saveUserLocation } = useAuth();

  const captureLocationSilently = async () => {
    if (!navigator.geolocation) return;
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 8000, maximumAge: 0,
        })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const geo = await r.json();
        if (geo?.display_name) address = geo.display_name;
      } catch { /* keep coordinate fallback */ }
      await saveUserLocation({ lat, lng, address });
    } catch { }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(loginData.email, loginData.password);
      const user = result.user || result.data?.user;
      if (!user) throw new Error('Login failed — no user returned.');

      captureLocationSilently();

      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Drivers authenticate by email against the unified /api/auth/login
  // endpoint — handled via loginDriver() in AuthContext.
  const handleDriverLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await loginDriver(driverData.email, driverData.password);
      const user = result.user;
      if (!user) throw new Error('Driver login failed — no driver returned.');
      navigate('/driver-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await register(
        registerData.name, registerData.email, registerData.password, registerData.phone
      );
      const user = result.user || result.data?.user;
      if (!user) throw new Error('Registration failed — no user returned.');

      captureLocationSilently();

      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: '100%', padding: '13px 14px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', color: '#1e293b', background: '#f8fafc',
    fontFamily: 'inherit',
  };

  const label = {
    display: 'block', fontSize: 13, fontWeight: 600, color: '#334155',
    marginBottom: 6,
  };

  const submitBtn = (busy) => ({
    width: '100%', padding: '15px', borderRadius: 8, border: 'none',
    background: busy ? '#86efac' : '#15803d', color: '#fff', fontSize: 14,
    fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer',
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 20,
    boxShadow: busy ? 'none' : '0 4px 14px rgba(21,128,61,0.35)',
    transition: 'all 0.2s',
  });

  const TABS = [
    { key: 'login',  label: 'LOGIN' },
    { key: 'signup', label: 'SIGN UP' },
    { key: 'driver', label: 'DRIVER' },
  ];

  const BADGES = [
    { icon: '🔒', title: '100% Secure', sub: 'Payment' },
    { icon: '🔄', title: 'Easy Returns', sub: 'Quick Refunds' },
    { icon: '🚚', title: 'Fast Delivery', sub: 'Across Kenya' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', Roboto, sans-serif", background: '#fff' }}>
      <div className="login-wrapper" style={{ display: 'flex', flex: 1, minHeight: '100vh' }}>

        {/* ── Left branding panel ─────────────────────────────────────── */}
        <div
          className="login-left"
          style={{
            flex: 1,
            display: 'flex',
            background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 60%, #bbf7d0 100%)',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 40px',
            textAlign: 'center',
          }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: '#15803d', color: '#fff', padding: '10px 20px',
            borderRadius: 12, fontWeight: 800, fontSize: 20, letterSpacing: 0.5,
            marginBottom: 28, boxShadow: '0 8px 20px rgba(21,128,61,0.25)',
          }}>
            <span style={{ fontSize: 22 }}>🌿</span>
            <span>
              CERESTRIAL
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3, opacity: 0.85 }}>VENTURES</div>
            </span>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#14532d', margin: '0 0 10px', lineHeight: 1.25 }}>
            Welcome to<br />Cerestrial<br />Ventures
          </h1>
          <p style={{ color: '#3f6b4f', fontSize: 14.5, maxWidth: 320, margin: '0 0 36px' }}>
            Kenya's trusted wholesale &amp; retail grocery supplier
          </p>

          <div style={{
            width: 150, height: 150, borderRadius: 28,
            background: 'linear-gradient(160deg, #4ade80 0%, #16a34a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 64, boxShadow: '0 16px 30px rgba(22,163,74,0.3)',
            marginBottom: 40,
          }}>
            🛒
          </div>

          <div style={{ display: 'flex', gap: 32 }}>
            {BADGES.map(b => (
              <div key={b.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 90 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{b.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#14532d' }}>{b.title}</div>
                <div style={{ fontSize: 10.5, color: '#3f6b4f' }}>{b.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right form panel ────────────────────────────────────────── */}
        <div
          className="login-right"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '48px 56px',
            background: '#fff',
            boxShadow: '-4px 0 30px rgba(0,0,0,0.06)',
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}
        >
          <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>

            <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', marginBottom: 28 }}>
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setError(null); }}
                  style={{
                    flex: 1, padding: '14px', background: 'none', border: 'none',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 1,
                    color: activeTab === tab.key ? '#15803d' : '#94a3b8',
                    borderBottom: activeTab === tab.key ? '2.5px solid #15803d' : '2.5px solid transparent',
                    marginBottom: -2, transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'login' && (
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#14532d', margin: '0 0 4px' }}>Login to your account</h2>
            )}
            {activeTab === 'signup' && (
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#14532d', margin: '0 0 4px' }}>Create your account</h2>
            )}
            {activeTab === 'driver' && (
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#14532d', margin: '0 0 4px' }}>Driver Login</h2>
            )}
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>
              {activeTab === 'login' && 'Welcome back! Please enter your details.'}
              {activeTab === 'signup' && 'Join Cerestrial Ventures today.'}
              {activeTab === 'driver' && 'Sign in to manage your deliveries.'}
            </p>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
                ⚠️ {error}
              </div>
            )}

            {activeTab === 'login' && (
              <form onSubmit={handleLogin}>
                <label style={label}>Email Address</label>
                <input type="email" required placeholder="you@example.com" value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} style={inp} />

                <label style={{ ...label, marginTop: 18 }}>Password</label>
                <input type="password" required placeholder="••••••••" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} style={inp} />

                <div style={{ textAlign: 'right', marginTop: 8 }}>
                  <a href="/forgot-password" style={{ fontSize: 12.5, color: '#15803d', fontWeight: 600, textDecoration: 'none' }}>Forgot password?</a>
                </div>

                <button type="submit" disabled={loading} style={submitBtn(loading)}>
                  {loading ? 'Logging in...' : 'LOGIN'}
                </button>
              </form>
            )}

            {activeTab === 'signup' && (
              <form onSubmit={handleRegister}>
                <label style={label}>Full Name</label>
                <input type="text" required placeholder="John Doe" value={registerData.name} onChange={e => setRegisterData({ ...registerData, name: e.target.value })} style={inp} />

                <label style={{ ...label, marginTop: 18 }}>Email Address</label>
                <input type="email" required placeholder="you@example.com" value={registerData.email} onChange={e => setRegisterData({ ...registerData, email: e.target.value })} style={inp} />

                <label style={{ ...label, marginTop: 18 }}>Phone Number</label>
                <input type="tel" required placeholder="07XXXXXXXX" value={registerData.phone} onChange={e => setRegisterData({ ...registerData, phone: e.target.value })} style={inp} />

                <label style={{ ...label, marginTop: 18 }}>Password</label>
                <input type="password" required placeholder="••••••••" value={registerData.password} onChange={e => setRegisterData({ ...registerData, password: e.target.value })} style={inp} />

                <label style={{ ...label, marginTop: 18 }}>Confirm Password</label>
                <input type="password" required placeholder="••••••••" value={registerData.confirmPassword} onChange={e => setRegisterData({ ...registerData, confirmPassword: e.target.value })} style={inp} />

                <button type="submit" disabled={loading} style={submitBtn(loading)}>
                  {loading ? 'Creating account...' : 'SIGN UP'}
                </button>
              </form>
            )}

            {activeTab === 'driver' && (
              <form onSubmit={handleDriverLogin}>
                <label style={label}>Email Address</label>
                <input type="email" required placeholder="driver@cerestrial.com" value={driverData.email} onChange={e => setDriverData({ ...driverData, email: e.target.value })} style={inp} />

                <label style={{ ...label, marginTop: 18 }}>Password</label>
                <input type="password" required placeholder="••••••••" value={driverData.password} onChange={e => setDriverData({ ...driverData, password: e.target.value })} style={inp} />

                <button type="submit" disabled={loading} style={submitBtn(loading)}>
                  {loading ? 'Logging in...' : 'DRIVER LOGIN'}
                </button>
              </form>
            )}

            {activeTab !== 'driver' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'login' ? 'signup' : 'login')}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 8,
                    border: '1.5px solid #15803d', background: '#fff', color: '#15803d',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {activeTab === 'login' ? 'Create a new account' : 'Already have an account? Login'}
                </button>
              </>
            )}

            <p style={{ fontSize: 11.5, color: '#94a3b8', textAlign: 'center', marginTop: 28, lineHeight: 1.6 }}>
              By continuing, you agree to Cerestrial Ventures'{' '}
              <a href="/terms" style={{ color: '#15803d', fontWeight: 600 }}>Terms &amp; Conditions</a>{' '}
              and <a href="/privacy" style={{ color: '#15803d', fontWeight: 600 }}>Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;