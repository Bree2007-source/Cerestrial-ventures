import mongoose from 'mongoose';

const securityLogSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  event: {          // renamed from 'action' to match securityLogger.js
    type:     String,
    required: true,
  },
  ipAddress: {
    type:    String,
    default: 'unknown',
  },
  userAgent: {
    type:    String,
    default: 'unknown',
  },
  meta: {
    type:    mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

// Auto-delete logs after 90 days
securityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.model('SecurityLog', securityLogSchema);