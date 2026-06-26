import mongoose from 'mongoose';

const loginOtpSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  otpCode:      { type: String, required: true },
  expiresAt:    { type: Date, required: true },
  used:         { type: Boolean, default: false },
  attemptCount: { type: Number, default: 0 },
  lockedUntil:  { type: Date, default: null },
  createdAt:    { type: Date, default: Date.now },
});

loginOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('LoginOtp', loginOtpSchema);