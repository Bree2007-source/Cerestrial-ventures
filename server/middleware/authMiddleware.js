import jwt  from 'jsonwebtoken';
import User from '../models/User.js';

// ─────────────────────────────────────────────────────────────────────────────
// protect  — verifies the JWT and attaches req.user / req.userId
//
// Token resolution order:
//   1. httpOnly cookie  (auth_token)
//   2. Authorization: Bearer <token>  header  (fallback for API clients)
// ─────────────────────────────────────────────────────────────────────────────
export const protect = async (req, res, next) => {
  try {
    // 1️⃣  Cookie-first strategy
    let token = req.cookies?.auth_token;

    // 2️⃣  Fallback: Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
    }

    // Verify & decode
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid token. Please log in again.';
      return res.status(401).json({ success: false, message });
    }

    // Guard against temp (2FA) tokens being used on protected routes
    if (decoded.purpose === '2fa') {
      return res.status(401).json({ success: false, message: 'Complete login verification first.' });
    }

    // Fetch user (exclude password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    if (user.isDisabled) {
      return res.status(403).json({ success: false, message: 'This account has been disabled. Please contact support.' });
    }

    // Attach to request — matches how authRoutes.js uses req.userId and req.user
    req.user   = user;
    req.userId = user._id;

    next();
  } catch (err) {
    console.error('[AuthMiddleware]', err);
    res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// requireRole(...roles)  — role-based access control (use after protect)
//
// Usage:  router.get('/admin', protect, requireRole('admin'), handler)
// ─────────────────────────────────────────────────────────────────────────────
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  // Support both isAdmin boolean and a generic role field
  const userRole = req.user.isAdmin ? 'admin' : (req.user.role || 'user');

  if (!roles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}.`,
    });
  }

  next();
};