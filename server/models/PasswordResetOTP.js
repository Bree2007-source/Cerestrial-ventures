import mongoose from 'mongoose'

const passwordResetOTPSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
  },
}, { timestamps: true })

passwordResetOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const PasswordResetOTP = mongoose.model('PasswordResetOTP', passwordResetOTPSchema)
export default PasswordResetOTP