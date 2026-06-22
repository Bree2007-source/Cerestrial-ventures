import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config'
import { useToast } from '../context/ToastContext'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [resetToken, setResetToken] = useState('')
  const [userId, setUserId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    } else if (step === 2) {
      setCanResend(true)
    }
    return () => clearTimeout(timer)
  }, [countdown, step])

  const startCountdown = () => {
    setCountdown(60)
    setCanResend(false)
  }

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Please enter your email address.'); return }
    setLoading(true)
    try {
      await axios.post(`${API_BASE_URL}/password-reset/request`, { email })
      toast.success('OTP sent! Check your email inbox.')
      setStep(2)
      startCountdown()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!canResend) return
    setLoading(true)
    try {
      await axios.post(`${API_BASE_URL}/password-reset/request`, { email })
      toast.info('New OTP sent to your email.')
      startCountdown()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      document.getElementById('otp-5')?.focus()
    }
    e.preventDefault()
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const otpString = otp.join('')
    if (otpString.length < 6) { toast.error('Please enter the complete 6-digit OTP.'); return }
    setLoading(true)
    try {
      const res = await axios.post(`${API_BASE_URL}/password-reset/verify`, { email, otp: otpString })
      setResetToken(res.data.resetToken)
      setUserId(res.data.userId)
      toast.success('OTP verified! Set your new password.')
      setStep(3)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return }
    setLoading(true)
    try {
      await axios.post(`${API_BASE_URL}/password-reset/reset`, { userId, resetToken, newPassword })
      toast.success('Password reset successfully! Please log in.')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Please start over.')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '13px 14px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', color: '#1e293b', background: '#fff',
    fontFamily: 'sans-serif',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8fafc',
      fontFamily: 'sans-serif', padding: '20px 16px', boxSizing: 'border-box',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '36px 28px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 4px 30px rgba(0,0,0,0.08)',
        boxSizing: 'border-box',
      }}>

        {/* Back button */}
        <button
          onClick={() => step === 1 ? navigate('/login') : setStep(s => s - 1)}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ← {step === 1 ? 'Back to login' : 'Back'}
        </button>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 99,
              background: s <= step ? '#15803d' : '#e2e8f0',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* STEP 1 — Email */}
        {step === 1 && (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>
              Forgot Password?
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
              Enter your registered email address and we'll send you a 6-digit OTP to reset your password.
            </p>
            <form onSubmit={handleRequestOtp}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>
                Email Address
              </label>
              <input
                type="email" required
                placeholder="Enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inp}
                onFocus={e => e.target.style.borderColor = '#15803d'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, marginBottom: 16 }}>
                We'll send a 6-digit code to this email. Check your spam folder if you don't see it.
              </p>
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: 14, borderRadius: 8, border: 'none',
                background: loading ? '#86efac' : '#15803d', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          </>
        )}

        {/* STEP 2 — OTP */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔐</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>
              Enter OTP
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 6px', lineHeight: 1.6 }}>
              We sent a 6-digit code to <strong>{email}</strong>.
            </p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>
              Check your inbox and spam folder. Code expires in{' '}
              <strong style={{ color: '#dc2626' }}>5 minutes</strong>.
            </p>

            <form onSubmit={handleVerifyOtp}>
              <div style={{
                display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24,
              }} onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    style={{
                      width: 44, height: 54, textAlign: 'center',
                      fontSize: 22, fontWeight: 700, borderRadius: 10,
                      border: `2px solid ${digit ? '#15803d' : '#e2e8f0'}`,
                      outline: 'none', color: '#1e293b', background: '#fff',
                      boxSizing: 'border-box', transition: 'border 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#15803d'}
                    onBlur={e => e.target.style.borderColor = digit ? '#15803d' : '#e2e8f0'}
                  />
                ))}
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: 14, borderRadius: 8, border: 'none',
                background: loading ? '#86efac' : '#15803d', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: 16,
              }}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>

            <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              {canResend ? (
                <span
                  onClick={handleResendOtp}
                  style={{ color: loading ? '#94a3b8' : '#15803d', cursor: loading ? 'default' : 'pointer', fontWeight: 600 }}
                >
                  {loading ? 'Sending...' : '🔄 Resend OTP'}
                </span>
              ) : (
                <span>Resend OTP in <strong style={{ color: '#1e293b' }}>{countdown}s</strong></span>
              )}
            </div>
          </>
        )}

        {/* STEP 3 — New password */}
        {step === 3 && (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔑</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>
              Create New Password
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
              Choose a strong password with at least 8 characters.
            </p>
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ ...inp, paddingRight: 46 }}
                    onFocus={e => e.target.style.borderColor = '#15803d'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8', padding: 0 }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Password strength */}
                {newPassword && (() => {
                  const strength = [
                    newPassword.length >= 8,
                    /[A-Z]/.test(newPassword),
                    /[0-9]/.test(newPassword),
                    /[^A-Za-z0-9]/.test(newPassword),
                  ].filter(Boolean).length
                  const colors = ['#dc2626', '#f59e0b', '#3b82f6', '#15803d']
                  const labels = ['Weak', 'Fair', 'Good', 'Strong']
                  return (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= strength ? colors[strength-1] : '#e2e8f0', transition: 'background 0.3s' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: colors[strength-1], fontWeight: 600 }}>
                        {labels[strength-1]}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>
                  Confirm New Password
                </label>
                <input
                  type="password" required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{
                    ...inp,
                    borderColor: confirmPassword && confirmPassword !== newPassword ? '#dc2626' : '#e2e8f0',
                  }}
                  onFocus={e => e.target.style.borderColor = '#15803d'}
                  onBlur={e => e.target.style.borderColor = confirmPassword && confirmPassword !== newPassword ? '#dc2626' : '#e2e8f0'}
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Passwords do not match.</p>
                )}
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: 14, borderRadius: 8, border: 'none',
                background: loading ? '#86efac' : '#15803d', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? 'Saving...' : '🔐 Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}