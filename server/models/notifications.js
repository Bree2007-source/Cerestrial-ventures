import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  userId:              { type: mongoose.Schema.Types.ObjectId, ref: 'User',   default: null },
  driverId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  isAdminNotification: { type: Boolean, default: false },
  title:               { type: String, required: true },
  message:             { type: String, required: true },
  type: {
    type: String,
    enum: ['order_placed','order_status','payment','low_stock','new_customer','driver_alert','general'],
    default: 'general',
  },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
}, { timestamps: true })

notificationSchema.index({ userId:              1, createdAt: -1 })
notificationSchema.index({ driverId:            1, createdAt: -1 })
notificationSchema.index({ isAdminNotification: 1, createdAt: -1 })
notificationSchema.index({ read: 1 })

const Notification = mongoose.model('Notification', notificationSchema)
export default Notification