import SecurityLog from '../models/SecurityLog.js';

/**
 * Log a security event to the database.
 *
 * @param {string} userId   - The user's MongoDB _id
 * @param {string} event    - Event type e.g. 'LOGIN_SUCCESS', 'OTP_FAILED'
 * @param {object} req      - Express request (for IP + user-agent)
 * @param {object} [meta]   - Optional extra data to store alongside the event
 */
export async function logSecurityEvent(userId, event, req, meta = {}) {
  try {
    await SecurityLog.create({
      userId,
      event,
      ipAddress:  req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent:  req.headers['user-agent'] || 'unknown',
      meta,
    });
  } catch (err) {
    // Never let logging crash the main flow
    console.error('[SecurityLogger] Failed to log event:', event, err.message);
  }
}