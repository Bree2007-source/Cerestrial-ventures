import mongoose from 'mongoose'

const securityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    default: 'unknown',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true })

securityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 })

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema)
export default SecurityLog