import mongoose from 'mongoose';

const trustedDeviceSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceToken: { type: String, required: true, unique: true, index: true },
  browser:     { type: String, default: 'Unknown' },
  os:          { type: String, default: 'Unknown' },
  device:      { type: String, default: 'Desktop' },
  ipAddress:   { type: String },
  expiresAt:   { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  createdAt:   { type: Date, default: Date.now },
});

trustedDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('TrustedDevice', trustedDeviceSchema);