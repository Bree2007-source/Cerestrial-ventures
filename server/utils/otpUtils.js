import crypto from 'crypto';

const OTP_EXPIRY_MINUTES = 5;

/** Returns a 6-digit numeric OTP string */
export function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

/** Returns the expiry Date for a freshly generated OTP */
export function getOtpExpiry() {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

/** Returns a cryptographically random device trust token */
export function generateDeviceToken() {
  return crypto.randomBytes(32).toString('hex');
}