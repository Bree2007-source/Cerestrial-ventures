import express from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import PasswordResetOTP from '../models/PasswordResetOTP.js'
import SecurityLog from '../models/SecurityLog.js'
import { sendEmail } from '../utils/notifications.js'

const router = express.Router()

const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown'

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString()

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(otp).digest('hex')

// POST /api/password-reset/request
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email address is required.' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If this email is registered, an OTP has been sent.' })
    }

    // Rate limit: max 3 OTP requests per hour
    const recentCount = await PasswordResetOTP.countDocuments({
      userId: user._id,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    })
    if (recentCount >= 3) {
      return res.status(429).json({ message: 'Too many OTP requests. Please wait an hour before trying again.' })
    }

    // Invalidate previous OTPs
    await PasswordResetOTP.deleteMany({ userId: user._id, verified: false })

    const otp = generateOtp()
    const otpHash = hashOtp(otp)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    await PasswordResetOTP.create({
      userId: user._id,
      phoneNumber: email, // reusing field to store email
      otpHash,
      expiresAt,
    })

    await sendEmail({
      to: email,
      subject: 'Cerestrial Ventures — Password Reset Code',
      text: `Your Cerestrial Ventures password reset code is ${otp}. This code expires in 5 minutes. Do not share it with anyone.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#15803d,#166534);border-radius:12px;padding:12px 20px;">
              <span style="font-size:24px;">🌾</span>
              <span style="color:white;font-weight:900;font-size:18px;margin-left:8px;">CERESTRIAL VENTURES</span>
            </div>
          </div>
          <div style="background:white;border-radius:12px;padding:28px 24px;border:1px solid #e2e8f0;">
            <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px;">Password Reset Request</h2>
            <p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6;">
              We received a request to reset your Cerestrial Ventures account password.
              Use the code below to proceed.
            </p>
            <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
              <div style="font-size:11px;color:#15803d;font-weight:700;letter-spacing:2px;margin-bottom:8px;">YOUR OTP CODE</div>
              <div style="font-size:40px;font-weight:900;color:#15803d;letter-spacing:10px;">${otp}</div>
              <div style="font-size:12px;color:#64748b;margin-top:8px;">Expires in <strong>5 minutes</strong></div>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
              If you did not request a password reset, you can safely ignore this email.
              Your password will remain unchanged.<br/><br/>
              <strong>Never share this code with anyone.</strong>
            </p>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">
            © 2024 Cerestrial Ventures · Wholesale & Retail Grocers · Nairobi, Kenya
          </p>
        </div>
      `,
    })

    await SecurityLog.create({
      userId: user._id,
      action: 'OTP_REQUESTED',
      ipAddress: getIp(req),
      metadata: { email },
    })

    res.json({ message: 'If this email is registered, an OTP has been sent.' })
  } catch (error) {
    console.error('OTP request error:', error)
    res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

// POST /api/password-reset/verify
router.post('/verify', async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' })

    const record = await PasswordResetOTP.findOne({
      phoneNumber: email.toLowerCase().trim(),
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 })

    if (!record) {
      return res.status(400).json({ message: 'OTP has expired or is invalid. Please request a new one.' })
    }

    if (record.attempts >= 3) {
      await PasswordResetOTP.deleteOne({ _id: record._id })
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' })
    }

    const inputHash = hashOtp(otp.toString().trim())
    if (inputHash !== record.otpHash) {
      record.attempts += 1
      await record.save()
      const remaining = 3 - record.attempts
      return res.status(400).json({
        message: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      })
    }

    record.verified = true
    await record.save()

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
    record.otpHash = resetTokenHash
    await record.save()

    await SecurityLog.create({
      userId: record.userId,
      action: 'OTP_VERIFIED',
      ipAddress: getIp(req),
    })

    res.json({
      message: 'OTP verified successfully.',
      resetToken,
      userId: record.userId,
    })
  } catch (error) {
    console.error('OTP verify error:', error)
    res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

// POST /api/password-reset/reset
router.post('/reset', async (req, res) => {
  try {
    const { userId, resetToken, newPassword } = req.body
    if (!userId || !resetToken || !newPassword) {
      return res.status(400).json({ message: 'All fields are required.' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' })
    }

    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

    const record = await PasswordResetOTP.findOne({
      userId,
      verified: true,
      otpHash: resetTokenHash,
      expiresAt: { $gt: new Date() },
    })

    if (!record) {
      return res.status(400).json({ message: 'Reset session expired or invalid. Please start over.' })
    }

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    const salt = await bcrypt.genSalt(12)
    user.password = await bcrypt.hash(newPassword, salt)
    await user.save()

    await PasswordResetOTP.deleteMany({ userId })

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Cerestrial Ventures — Password Changed Successfully',
      text: 'Your Cerestrial Ventures password has been reset successfully. If you did not do this, contact us immediately.',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
          <div style="background:white;border-radius:12px;padding:28px 24px;border:1px solid #e2e8f0;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">✅</div>
            <h2 style="color:#15803d;margin:0 0 8px;">Password Reset Successful</h2>
            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">
              Your Cerestrial Ventures account password has been changed successfully.
              You can now log in with your new password.
            </p>
            <p style="color:#dc2626;font-size:13px;font-weight:600;margin:0;">
              If you did not make this change, please contact us immediately.
            </p>
          </div>
        </div>
      `,
    })

    await SecurityLog.create({
      userId,
      action: 'PASSWORD_RESET_SUCCESS',
      ipAddress: getIp(req),
    })

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' })
  } catch (error) {
    console.error('Password reset error:', error)
    res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

export default router