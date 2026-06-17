import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(loginData.email, loginData.password);
      const user = result?.user;
      if (!user) throw new Error('Login failed — no user returned.');
      navigate(user.isAdmin ? '/admin' : '/');
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
      const result = await register(registerData.name, registerData.email, registerData.password, registerData.phone);
      const user = result?.user;
      if (!user) throw new Error('Registration failed — no user returned.');
      navigate(user.isAdmin ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: '100%', padding: '13px 14px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', color: '#1e293b', background: '#fff',
    fontFamily: 'sans-serif',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', background: '#fff' }}>

      <style>{`
        @media (min-width: 768px) {
          .login-wrapper { flex-direction: row !important; }
          .login-left { display: flex !important; }
          .login-right { width: 460px !important; min-height: 100vh !important; }
        }
        @media (max-width: 767px) {
          .login-left { display: none !important; }
          .login-right { width: 100% !important; padding: 32px 20px !important; min-height: 100vh !important; }
        }
      `}</style>

      <div className="login-wrapper" style={{ display: 'flex', flex: 1 }}>

        {/* LEFT PANEL - hidden on mobile */}
        <div className="login-left" style={{
          flex: 1,
          background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 60%, #bbf7d0 100%)',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '48px 40px',
        }}>
          <div style={{ marginBottom: 36, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 6 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg, #15803d, #166534)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, boxShadow: '0 4px 14px rgba(21,128,61,0.35)',
              }}>🌾</div>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#14532d', letterSpacing: '-0.5px' }}>
                CERESTRIAL
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
              Ventures
            </div>
          </div>

          <div style={{ textAlign: 'center', maxWidth: 360, marginBottom: 36 }}>
            <h1 style={{ fontSize: 34, fontWeight: 900, color: '#14532d', margin: '0 0 14px', lineHeight: 1.2 }}>
              Welcome to<br />Cerestrial Ventures
            </h1>
            <p style={{ fontSize: 15, color: '#15803d', margin: 0, lineHeight: 1.7 }}>
              Kenya's trusted wholesale & retail<br />grocery supplier
            </p>
          </div>

          <div style={{
            width: 200, height: 200, borderRadius: 24,
            background: 'linear-gradient(135deg, #86efac, #4ade80)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 80, marginBottom: 40,
            boxShadow: '0 12px 40px rgba(21,128,61,0.2)',
          }}>🛒</div>

          <div style={{ display: 'flex', gap: 36 }}>
            {[
              { icon: '🔒', label: '100% Secure', sub: 'Payment' },
              { icon: '🔄', label: 'Easy Returns', sub: 'Quick Refunds' },
              { icon: '🚚', label: 'Fast Delivery', sub: 'Across Kenya' },
            ].map(({ icon, label, sub }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 5 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#16a34a' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL - full width on mobile */}
        <div className="login-right" style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '48px 40px', background: '#fff',
          boxShadow: '-4px 0 30px rgba(0,0,0,0.07)',
          boxSizing: 'border-box', overflowY: 'auto',
        }}>

          {/* Mobile logo - only visible on mobile */}
          <div style={{ textAlign: 'center', marginBottom: 28 }} className="mobile-logo">
            <style>{`.mobile-logo { display: none; } @media (max-width: 767px) { .mobile-logo { display: block !important; } }`}</style>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, #15803d, #166534)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>🌾</div>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#14532d' }}>CERESTRIAL VENTURES</span>
            </div>
            <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, letterSpacing: 2 }}>WHOLESALE & RETAIL GROCERS</div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', marginBottom: 28 }}>
            {[{ key: 'login', label: 'LOGIN' }, { key: 'signup', label: 'SIGN UP' }].map(tab => (
              <button key={tab.key}
                onClick={() => { setActiveTab(tab.key); setError(null); }}
                style={{
                  flex: 1, padding: '14px', background: 'none', border: 'none',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: 1,
                  color: activeTab === tab.key ? '#15803d' : '#94a3b8',
                  borderBottom: activeTab === tab.key ? '2.5px solid #15803d' : '2.5px solid transparent',
                  marginBottom: -2, transition: 'all 0.2s',
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
              ⚠️ {error}
            </div>
          )}

          {/* LOGIN */}
          {activeTab === 'login' && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>Login to your account</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>Welcome back! Please enter your details.</p>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>Email Address</label>
                  <input
                    type="email" required
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                    style={inp}
                    onFocus={e => e.target.style.borderColor = '#15803d'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'} required
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                      style={{ ...inp, paddingRight: 46 }}
                      onFocus={e => e.target.style.borderColor = '#15803d'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8', padding: 0 }}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginBottom: 24 }}>
                  <span style={{ fontSize: 13, color: '#15803d', cursor: 'pointer', fontWeight: 600 }}>Forgot password?</span>
                </div>

                <button type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 8, border: 'none',
                    background: loading ? '#86efac' : '#15803d',
                    color: '#fff', fontSize: 15, fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20,
                  }}>
                  {loading ? 'Logging in...' : 'LOGIN'}
                </button>

                <div style={{ position: 'relative', textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#e2e8f0' }} />
                  <span style={{ position: 'relative', background: '#fff', padding: '0 14px', color: '#94a3b8', fontSize: 13 }}>OR</span>
                </div>

                <button type="button"
                  onClick={() => { setActiveTab('signup'); setError(null); }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 8,
                    border: '1.5px solid #e2e8f0', background: '#fff',
                    color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Create a new account
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
                By continuing, you agree to Cerestrial Ventures'{' '}
                <span style={{ color: '#15803d', cursor: 'pointer' }}>Terms & Conditions</span>{' '}and{' '}
                <span style={{ color: '#15803d', cursor: 'pointer' }}>Privacy Policy</span>.
              </p>
            </>
          )}

          {/* SIGN UP */}
          {activeTab === 'signup' && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>Create your account</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>Join thousands of traders on Cerestrial Ventures.</p>

              <form onSubmit={handleRegister}>
                {[
                  { label: 'Full Name', field: 'name', type: 'text', placeholder: 'Enter your full name' },
                  { label: 'Email Address', field: 'email', type: 'email', placeholder: 'Enter your email' },
                  { label: 'Phone Number', field: 'phone', type: 'tel', placeholder: 'e.g. 0712345678' },
                ].map(({ label, field, type, placeholder }) => (
                  <div key={field} style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>{label}</label>
                    <input
                      type={type} required={field !== 'phone'}
                      placeholder={placeholder}
                      value={registerData[field]}
                      onChange={e => setRegisterData({ ...registerData, [field]: e.target.value })}
                      style={inp}
                      onFocus={e => e.target.style.borderColor = '#15803d'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                ))}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'} required
                      placeholder="Create a password"
                      value={registerData.password}
                      onChange={e => setRegisterData({ ...registerData, password: e.target.value })}
                      style={{ ...inp, paddingRight: 46 }}
                      onFocus={e => e.target.style.borderColor = '#15803d'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8', padding: 0 }}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>Confirm Password</label>
                  <input
                    type="password" required
                    placeholder="Repeat your password"
                    value={registerData.confirmPassword}
                    onChange={e => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    style={inp}
                    onFocus={e => e.target.style.borderColor = '#15803d'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                <button type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 8, border: 'none',
                    background: loading ? '#86efac' : '#15803d',
                    color: '#fff', fontSize: 15, fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20,
                  }}>
                  {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                By continuing, you agree to Cerestrial Ventures'{' '}
                <span style={{ color: '#15803d', cursor: 'pointer' }}>Terms & Conditions</span>{' '}and{' '}
                <span style={{ color: '#15803d', cursor: 'pointer' }}>Privacy Policy</span>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;