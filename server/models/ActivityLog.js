import mongoose from 'mongoose'

const activityLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  details: { type: Object, default: {} },
  ip: { type: String },
}, { timestamps: true })

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema)
export default ActivityLog
