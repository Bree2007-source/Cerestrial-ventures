import jwt    from 'jsonwebtoken';
import User   from '../models/User.js';
import Driver from '../models/Driver.js';

// ─────────────────────────────────────────────────────────────────────────────
// protect  — verifies the JWT and attaches req.user / req.userId / req.userRole
//
// Token resolution order:
//   1. httpOnly cookie  (auth_token)
//   2. Authorization: Bearer <token>  header  (fallback for API clients)
//
// Supports two token shapes:
//   - Customer/Admin tokens: { id }                  -> looked up in User
//   - Driver tokens:         { id, role: 'driver' }   -> looked up in Driver
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

    // ── Driver token branch ────────────────────────────────────────────────
    if (decoded.role === 'driver') {
      const driver = await Driver.findById(decoded.id).select('-password');
      if (!driver) {
        return res.status(401).json({ success: false, message: 'Driver account no longer exists.' });
      }
      if (!driver.isActive) {
        return res.status(403).json({ success: false, message: 'This driver account has been deactivated. Please contact admin.' });
      }
      req.user     = driver;
      req.userId   = driver._id;
      req.userRole = 'driver';
      return next();
    }

    // ── Customer/Admin token branch ────────────────────────────────────────
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    if (user.isDisabled) {
      return res.status(403).json({ success: false, message: 'This account has been disabled. Please contact support.' });
    }

    req.user     = user;
    req.userId   = user._id;
    req.userRole = user.isAdmin ? 'admin' : 'customer';

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

  const userRole = req.userRole || (req.user.isAdmin ? 'admin' : (req.user.role || 'user'));

  if (!roles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}.`,
    });
  }

  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// requireDriver  — shorthand for "must be logged in as a driver"
// (use after protect)
// ─────────────────────────────────────────────────────────────────────────────
export const requireDriver = requireRole('driver');

// ─────────────────────────────────────────────────────────────────────────────
// requireOwnDriverRecord  — a driver may only act on their OWN driver id.
// Compares req.params.id (or req.params.driverId) against req.user._id.
// Admins bypass this check entirely. (use after protect + requireRole('driver','admin'))
// ─────────────────────────────────────────────────────────────────────────────
export const requireOwnDriverRecord = (req, res, next) => {
  if (req.userRole === 'admin') return next();

  const paramId = req.params.id || req.params.driverId;
  if (req.userRole === 'driver' && paramId && req.user._id.toString() === paramId) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'You can only access your own driver data.' });
};