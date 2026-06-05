import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['percent', 'fixed'], default: 'fixed' },
  value: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  expiresAt: { type: Date },
  usesLeft: { type: Number, default: null },
  active: { type: Boolean, default: true }
}, { timestamps: true })

const Coupon = mongoose.model('Coupon', couponSchema)
export default Coupon
