import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OTP_SECONDS = 300;
const GREEN = '#1a7a4a';

export default function VerifyLogin() {
  const { verifyOtp, resendOtp, requiresOtp, logout } = useAuth();
  const navigate = useNavigate();

  const [digits, setDigits]             = useState(['', '', '', '', '', '']);
  const [remember, setRemember]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [resending, setResending]       = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [locked, setLocked]             = useState(false);
  const [lockEnd, setLockEnd]           = useState(null);
  const [timeLeft, setTimeLeft]         = useState(OTP_SECONDS);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const [verified, setVerified]         = useState(false); // ← NEW

  const inputRefs = useRef([]);

  // Redirect if no pending OTP session — skip if we just verified successfully
  useEffect(() => {
    if (!requiresOtp && !verified) navigate('/login', { replace: true });
  }, [requiresOtp, verified]);

  // OTP countdown
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Lock countdown
  useEffect(() => {
    if (!lockEnd) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((lockEnd - Date.now()) / 1000));
      setLockTimeLeft(left);
      if (left === 0) { setLocked(false); setLockEnd(null); }
    }, 1000);
    return () => clearInterval(t);
  }, [lockEnd]);

  const handleDigit = (idx, val) => {
    const v = val.replace(/\D/, '').slice(-1);
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    if (v && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = e => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit code.'); return; }

    setError('');
    setLoading(true);
    try {
      const data = await verifyOtp(code, remember);
      if (data.success) {
        setVerified(true);              // ← prevent useEffect redirect to /login
        navigate('/', { replace: true });
      }
    } catch (err) {
      const d = err.response?.data || {};
      if (d.locked) {
        setLocked(true);
        setLockEnd(new Date(d.lockedUntil).getTime());
        setError(d.message);
      } else {
        setError(d.message || 'Verification failed.');
        if (d.attemptsLeft !== undefined) setAttemptsLeft(d.attemptsLeft);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      const data = await resendOtp();
      if (data.success) {
        setSuccess('New code sent! Check your email.');
        setDigits(['', '', '', '', '', '']);
        setTimeLeft(OTP_SECONDS);
        inputRefs.current[0]?.focus();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    logout();
    navigate('/login');
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <span style={styles.icon}>🔐</span>
        </div>
        <h2 style={styles.title}>Verify your identity</h2>
        <p style={styles.sub}>
          We sent a 6-digit verification code to your email.{' '}
          <span style={{ color: GREEN, fontWeight: 600 }}>Check your inbox.</span>
        </p>

        <div style={{ ...styles.timerBadge, color: timeLeft < 60 ? '#e53e3e' : GREEN }}>
          ⏱ Code expires in {fmt(timeLeft)}
        </div>

        {error   && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {locked && (
          <div style={styles.lockBox}>
            🔒 Verification locked for {fmt(lockTimeLeft)}
          </div>
        )}

        <div style={styles.otpRow} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              disabled={loading || locked}
              style={{
                ...styles.otpInput,
                borderColor: d ? GREEN : '#d0d5dd',
                background:  d ? '#f0faf5' : '#fff',
              }}
            />
          ))}
        </div>

        {attemptsLeft !== null && !locked && (
          <p style={styles.attemptsText}>
            ⚠️ {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining before lockout
          </p>
        )}

        <label style={styles.rememberLabel}>
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
            style={{ marginRight: '8px', accentColor: GREEN }}
          />
          Remember this device for 30 days
        </label>

        <button
          onClick={handleVerify}
          disabled={loading || locked || digits.join('').length < 6}
          style={{
            ...styles.btn,
            opacity: (loading || locked || digits.join('').length < 6) ? 0.6 : 1,
          }}
        >
          {loading ? 'Verifying…' : 'Verify & Sign In'}
        </button>

        <button
          onClick={handleResend}
          disabled={resending || timeLeft > 240}
          style={styles.resendBtn}
        >
          {resending ? 'Sending…' : timeLeft > 240 ? `Resend available in ${fmt(timeLeft - 240)}` : '↺ Resend Code'}
        </button>

        <button onClick={handleBack} style={styles.backBtn}>
          ← Back to Login
        </button>
      </div>
    </div>
  );
}

const styles = {
  page:          { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: '16px' },
  card:          { background: '#fff', borderRadius: '16px', padding: '40px 32px', width: '100%', maxWidth: '440px', boxShadow: '0 4px 32px rgba(0,0,0,0.10)', textAlign: 'center' },
  iconWrap:      { marginBottom: '16px' },
  icon:          { fontSize: '48px' },
  title:         { margin: '0 0 8px', fontSize: '24px', fontWeight: 700, color: '#111' },
  sub:           { margin: '0 0 20px', color: '#555', fontSize: '14px', lineHeight: 1.6 },
  timerBadge:    { display: 'inline-block', fontWeight: 700, fontSize: '15px', marginBottom: '16px', background: '#f7f7f7', padding: '6px 14px', borderRadius: '20px' },
  errorBox:      { background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', marginBottom: '12px', textAlign: 'left' },
  successBox:    { background: '#f0faf5', border: '1px solid #9ae6b4', color: '#276749', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', marginBottom: '12px' },
  lockBox:       { background: '#fffbeb', border: '1px solid #f6e05e', color: '#744210', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', marginBottom: '12px', fontWeight: 600 },
  otpRow:        { display: 'flex', gap: '10px', justifyContent: 'center', margin: '8px 0 16px' },
  otpInput:      { width: '48px', height: '56px', textAlign: 'center', fontSize: '24px', fontWeight: 700, border: '2px solid #d0d5dd', borderRadius: '10px', outline: 'none', transition: 'border-color .2s, background .2s' },
  attemptsText:  { color: '#c05621', fontSize: '13px', margin: '-8px 0 12px', fontWeight: 500 },
  rememberLabel: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#444', margin: '0 0 20px', cursor: 'pointer' },
  btn:           { width: '100%', padding: '14px', background: GREEN, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginBottom: '12px', transition: 'opacity .2s' },
  resendBtn:     { width: '100%', padding: '11px', background: 'transparent', color: GREEN, border: `1.5px solid ${GREEN}`, borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '10px' },
  backBtn:       { background: 'none', border: 'none', color: '#666', fontSize: '13px', cursor: 'pointer', padding: '8px', textDecoration: 'underline' },
};