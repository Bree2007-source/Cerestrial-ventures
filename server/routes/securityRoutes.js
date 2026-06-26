import express        from 'express';
import bcrypt         from 'bcryptjs';

import User            from '../models/User.js';
import SecurityLog     from '../models/SecurityLog.js';
import PasswordHistory from '../models/PasswordHistory.js';
import TrustedDevice   from '../models/TrustedDevice.js';
import LoginOtp        from '../models/LoginOtp.js';

import { protect, adminOnly }       from '../middleware/adminMiddleware.js';
import { passwordChangeLimiter }    from '../middleware/rateLimiter.js';
import { logSecurityEvent }         from '../utils/securityLogger.js';
import { sendPasswordChangedEmail } from '../utils/sendEmail.js';
import { sendPasswordChangedSms }   from '../utils/sendSms.js';

const router = express.Router();

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=<>])[A-Za-z\d@$!%*?&#^()_\-+=<>]{8,}$/;

// POST /api/security/change-password
router.post('/change-password', protect, passwordChangeLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword)
      return res.status(400).json({ success: false, message: 'All fields are required.' });

    if (newPassword !== confirmPassword)
      return res.status(400).json({ success: false, message: 'New passwords do not match.' });

    if (!PASSWORD_REGEX.test(newPassword))
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.',
      });

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isCurrentCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentCorrect)
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    // Prevent reusing last 5 passwords
    const history = await PasswordHistory.find({ userId: user._id }).sort({ changedAt: -1 }).limit(5);
    for (const h of history) {
      if (await bcrypt.compare(newPassword, h.passwordHash))
        return res.status(400).json({ success: false, message: 'You cannot reuse a recent password. Please choose a different one.' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await PasswordHistory.create({ userId: user._id, passwordHash: user.password });

    user.password          = newHash;
    user.passwordChangedAt = new Date();
    await user.save();

    await logSecurityEvent(user._id, 'PASSWORD_CHANGED', req);

    const firstName = user.name?.split(' ')[0] || '';
    await sendPasswordChangedEmail(user.email, firstName);
    if (user.phoneNumber) await sendPasswordChangedSms(user.phoneNumber);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[ChangePassword]', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/security/logs
router.get('/logs', protect, async (req, res) => {
  try {
    const logs = await SecurityLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/security/trusted-devices
router.get('/trusted-devices', protect, async (req, res) => {
  try {
    const devices = await TrustedDevice.find({
      userId:    req.user._id,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    res.json({ success: true, devices });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/security/trusted-devices/:id
router.delete('/trusted-devices/:id', protect, async (req, res) => {
  try {
    await TrustedDevice.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Device removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ADMIN: GET /api/security/admin/logs
router.get('/admin/logs', protect, adminOnly, async (req, res) => {
  try {
    const { event, userId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (event)  filter.event  = event;
    if (userId) filter.userId = userId;

    const [logs, total] = await Promise.all([
      SecurityLog.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      SecurityLog.countDocuments(filter),
    ]);

    res.json({ success: true, logs, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ADMIN: GET /api/security/admin/summary
router.get('/admin/summary', protect, adminOnly, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [loginSuccesses, loginFailures, otpFailures, accountLockouts, passwordChanges] =
      await Promise.all([
        SecurityLog.countDocuments({ event: 'LOGIN_SUCCESS',    createdAt: { $gte: since } }),
        SecurityLog.countDocuments({ event: 'LOGIN_FAILURE',    createdAt: { $gte: since } }),
        SecurityLog.countDocuments({ event: 'OTP_FAILED',       createdAt: { $gte: since } }),
        SecurityLog.countDocuments({ event: 'ACCOUNT_LOCKED',   createdAt: { $gte: since } }),
        SecurityLog.countDocuments({ event: 'PASSWORD_CHANGED', createdAt: { $gte: since } }),
      ]);

    const suspicious = await SecurityLog.aggregate([
      { $match: { event: { $in: ['LOGIN_FAILURE', 'OTP_FAILED'] }, createdAt: { $gte: since } } },
      { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
      { $match: { count: { $gte: 3 } } },
      { $sort:  { count: -1 } },
      { $limit: 20 },
    ]);

    res.json({
      success: true,
      summary: { loginSuccesses, loginFailures, otpFailures, accountLockouts, passwordChanges, suspiciousIps: suspicious },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ADMIN: POST /api/security/admin/force-logout/:userId
router.post('/admin/force-logout/:userId', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userId, { forcedLogoutAt: new Date() });
    await logSecurityEvent(req.params.userId, 'FORCE_LOGOUT', req, { by: req.user._id });
    res.json({ success: true, message: 'User has been logged out.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ADMIN: PATCH /api/security/admin/disable/:userId
router.patch('/admin/disable/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { disable, reason } = req.body;
    await User.findByIdAndUpdate(req.params.userId, {
      isDisabled:     !!disable,
      disabledReason: disable ? (reason || 'Disabled by admin') : null,
    });
    await logSecurityEvent(req.params.userId, 'ACCOUNT_DISABLED', req, { disable, reason, by: req.user._id });
    res.json({ success: true, message: `Account ${disable ? 'disabled' : 'enabled'} successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

export default router;