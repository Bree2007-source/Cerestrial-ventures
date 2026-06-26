import express          from 'express'
import crypto           from 'crypto'
import bcrypt           from 'bcryptjs'
import User             from '../models/User.js'
import PasswordResetOTP from '../models/PasswordResetOTP.js'
import SecurityLog      from '../models/SecurityLog.js'
import { sendEmail }    from '../utils/notifications.js'

const router = express.Router()

const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown'

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString()

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(otp).digest('hex')

router.post('/request', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email address is required.' })
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) return res.json({ message: 'If this email is registered, an OTP has been sent.' })
    const recentCount = await PasswordResetOTP.countDocuments({
      userId: user._id,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    })
    if (recentCount >= 3) return res.status(429).json({ message: 'Too many OTP requests. Please wait an hour.' })
    await PasswordResetOTP.deleteMany({ userId: user._id, verified: false })
    const otp = generateOtp()
    const otpHash = hashOtp(otp)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    await PasswordResetOTP.create({ userId: user._id, phoneNumber: email, otpHash, expiresAt })
    await sendEmail({
      to: email,
      subject: 'Cerestrial Ventures — Password Reset Code',
      text: `Your password reset code is ${otp}. Expires in 5 minutes. Do not share it.`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;"><div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;text-align:center;"><div style="font-size:40px;font-weight:900;color:#15803d;letter-spacing:10px;">${otp}</div><div style="font-size:12px;color:#64748b;margin-top:8px;">Expires in <strong>5 minutes</strong></div></div></div>`,
    })
    await SecurityLog.create({ userId: user._id, event: 'OTP_REQUESTED', ipAddress: getIp(req), meta: { email } })
    res.json({ message: 'If this email is registered, an OTP has been sent.' })
  } catch (error) {
    console.error('OTP request error:', error)
    res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' })
    const record = await PasswordResetOTP.findOne({
      phoneNumber: email.toLowerCase().trim(),
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 })
    if (!record) return res.status(400).json({ message: 'OTP has expired or is invalid. Please request a new one.' })
    if (record.attempts >= 3) {
      await PasswordResetOTP.deleteOne({ _id: record._id })
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' })
    }
    const inputHash = hashOtp(otp.toString().trim())
    if (inputHash !== record.otpHash) {
      record.attempts += 1
      await record.save()
      const remaining = 3 - record.attempts
      return res.status(400).json({ message: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` })
    }
    record.verified = true
    await record.save()
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
    record.otpHash = resetTokenHash
    await record.save()
    await SecurityLog.create({ userId: record.userId, event: 'OTP_VERIFIED', ipAddress: getIp(req), meta: {} })
    res.json({ message: 'OTP verified successfully.', resetToken, userId: record.userId })
  } catch (error) {
    console.error('OTP verify error:', error)
    res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

router.post('/reset', async (req, res) => {
  try {
    const { resetToken, userId, newPassword } = req.body
    if (!resetToken || !userId || !newPassword) return res.status(400).json({ message: 'Missing required fields.' })
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' })
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
    const record = await PasswordResetOTP.findOne({ userId, otpHash: resetTokenHash, verified: true })
    if (!record) return res.status(400).json({ message: 'Invalid or expired reset token.' })
    const user = await User.findById(userId).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    user.password = newPassword
    user.passwordChangedAt = new Date()
    await user.save()
    await PasswordResetOTP.deleteMany({ userId })
    await SecurityLog.create({ userId: user._id, event: 'PASSWORD_RESET', ipAddress: getIp(req), meta: {} })
    res.json({ message: 'Password reset successfully. You can now log in.' })
  } catch (error) {
    console.error('Password reset error:', error)
    res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

export default router