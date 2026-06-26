import rateLimit from 'express-rate-limit';

// Max 10 login attempts per 15 min per IP
export const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Max 5 OTP attempts per 10 min per IP
export const otpLimiter = rateLimit({
  windowMs:        10 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many verification attempts. Please wait 10 minutes.' },
});

// Max 3 password changes per hour per IP
export const passwordChangeLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many password change attempts. Please try again in an hour.' },
});