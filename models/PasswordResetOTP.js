import mongoose from 'mongoose';

const passwordResetOTPSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  phoneNumber: { type: String, required: true },
  otpHash:     { type: String, required: true },
  expiresAt:   { type: Date, required: true },
  verified:    { type: Boolean, default: false },
  attempts:    { type: Number, default: 0 },
}, { timestamps: true });

passwordResetOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PasswordResetOTP', passwordResetOTPSchema);