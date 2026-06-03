import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // For testing before backend connection: simulated verification
    if (email === 'admin@cerestrial.com' && password === 'admin123') {
      const mockAdminUser = {
        name: 'System Master Admin',
        email: 'admin@cerestrial.com',
        role: 'admin',
        token: 'mock-jwt-token-xyz'
      };
      login(mockAdminUser);
      alert('Welcome back, Admin!');
      navigate('/admin'); // Sends admin straight to dashboard
    } else if (email === 'customer@example.com' && password === 'customer123') {
      const mockCustomerUser = {
        name: 'Brenda Kathure',
        email: 'customer@example.com',
        role: 'customer',
        token: 'mock-jwt-token-abc'
      };
      login(mockCustomerUser);
      alert('Logged in successfully!');
      navigate('/'); // Sends customer to shopping catalog
    } else {
      setError('Invalid email or password combination.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', fontFamily: 'sans-serif', backgroundColor: '#f8fafc' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        
        <h2 style={{ textAlign: 'center', color: '#15803d', marginBottom: '8px', marginTop: 0 }}>Welcome Back</h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Sign in to manage your Cerestrial orders.</p>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '4px', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@cerestrial.com" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" style={{ backgroundColor: '#15803d', color: 'white', border: 'none', padding: '12px', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', transition: 'background-color 0.2s' }}>
            Secure Sign In
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
          New to Cerestrial? <Link to="/register" style={{ color: '#15803d', fontWeight: 'bold', textDecoration: 'none' }}>Create an account</Link>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;