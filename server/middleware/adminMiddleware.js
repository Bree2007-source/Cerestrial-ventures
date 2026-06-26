import { protect } from './authMiddleware.js';

// Re-export protect so routes that import it from here also work
export { protect };

export const admin = (req, res, next) => {
  if (!req.user) {
    return protect(req, res, () => checkAdmin(req, res, next));
  }
  checkAdmin(req, res, next);
};

// Alias — some routes import it as adminOnly
export const adminOnly = admin;

function checkAdmin(req, res, next) {
  if (req.user?.isAdmin) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin privileges required.',
  });
}