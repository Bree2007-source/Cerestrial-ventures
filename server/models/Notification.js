import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // NEW — lets a notification target a specific driver, the same way
  // userId targets a specific customer. Existing customer/admin
  // notifications are unaffected: they simply leave this null.
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  isAdminNotification: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['order_placed', 'order_status', 'low_stock', 'new_customer', 'general'],
    default: 'general'
  },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
}, { timestamps: true })

notificationSchema.index({ driverId: 1, createdAt: -1 })

const Notification = mongoose.model('Notification', notificationSchema)
export default Notification