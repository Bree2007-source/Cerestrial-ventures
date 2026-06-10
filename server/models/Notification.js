import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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

const Notification = mongoose.model('Notification', notificationSchema)
export default Notification