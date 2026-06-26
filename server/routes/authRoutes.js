import express        from 'express';
import jwt            from 'jsonwebtoken';
import bcrypt         from 'bcryptjs';
import cookieParser   from 'cookie-parser';

import User           from '../models/User.js';
import Notification   from '../models/Notification.js';
import LoginOtp       from '../models/LoginOtp.js';
import TrustedDevice  from '../models/TrustedDevice.js';

import { protect }                      from '../middleware/authMiddleware.js';
import { loginLimiter, otpLimiter }     from '../middleware/rateLimiter.js';
import { logSecurityEvent }             from '../utils/securityLogger.js';
import { generateOtp, getOtpExpiry, generateDeviceToken } from '../utils/otpUtils.js';
import { parseUserAgent }               from '../utils/deviceParser.js';
import { sendOtpEmail }                 from '../utils/sendEmail.js';
import { sendOtpSms }                   from '../utils/sendSms.js';

const router = express.Router();

// ── Helper: safe user payload ─────────────────────────────────────────────
function userPayload(user) {
  return {
    _id:                     user._id,
    name:                    user.name,
    email:                   user.email,
    phone:                   user.phone,
    phoneNumber:             user.phoneNumber,
    isAdmin:                 user.isAdmin,
    accountType:             user.accountType,
    businessInfo:            user.businessInfo,
    notificationPreferences: user.notificationPreferences,
    passwordChangedAt:       user.passwordChangedAt,
    createdAt:               user.createdAt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ═══════════════════════════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, accountType, businessInfo } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists)
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });

    const user = await User.create({
      name:        name.trim(),
      email:       email.toLowerCase().trim(),
      password,
      phone:       phone || '',
      accountType: accountType || 'Retail',
      businessInfo: accountType === 'Wholesale' ? businessInfo : undefined,
    });

    await Notification.create({
      isAdminNotification: true,
      title:   'New Customer Registered 👤',
      message: `${name} (${email}) just created an account.`,
      type:    'new_customer',
      link:    '/admin',
    }).catch(() => {});

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      token,
      user: userPayload(user),
    });
  } catch (err) {
    console.error('[Register]', err);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/login  — direct login, no OTP
// ═══════════════════════════════════════════════════════════════════════════
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      if (user) await logSecurityEvent(user._id, 'LOGIN_FAILURE', req);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.isDisabled)
      return res.status(403).json({ success: false, message: 'This account has been disabled. Please contact support.' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await logSecurityEvent(user._id, 'LOGIN_SUCCESS', req, { method: 'direct' });

    return res.json({
      success: true,
      token,
      user: userPayload(user),
    });
  } catch (err) {
    console.error('[Login]', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/auth/update  — update own profile
// ═══════════════════════════════════════════════════════════════════════════
router.put('/update', protect, async (req, res) => {
  try {
    const { name, email, phone, phoneNumber, accountType, businessInfo, notificationPreferences } = req.body;

    const updates = {};
    if (name)  updates.name  = name.trim();
    if (email) updates.email = email.toLowerCase().trim();
    if (phone !== undefined) updates.phone = phone;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (accountType) updates.accountType = accountType;
    if (businessInfo) updates.businessInfo = businessInfo;
    if (notificationPreferences) updates.notificationPreferences = notificationPreferences;

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user)
      return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({ success: true, user: userPayload(user) });
  } catch (err) {
    console.error('[UpdateProfile]', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

export default router;