// server/models/User.js — updated with accountType + businessInfo fields
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  password:    { type: String, required: true },
  phone:       { type: String, default: '' },
  isAdmin:     { type: Boolean, default: false },

  // ✅ NEW: account type for Retail / Wholesale
  accountType: { type: String, enum: ['Retail', 'Wholesale'], default: 'Retail' },

  // ✅ NEW: optional business info
  businessInfo: {
    businessName: { type: String, default: '' },
    kraPin:       { type: String, default: '' },
    bizType:      { type: String, default: 'Sole Proprietor' },
  },

  notificationPreferences: {
    orderUpdates: { type: Boolean, default: true },
    promotions:   { type: Boolean, default: true },
    restock:      { type: Boolean, default: false },
  },

  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

}, {
  // ✅ timestamps: true gives us createdAt and updatedAt automatically
  timestamps: true,
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;