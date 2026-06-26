import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone:    { type: String, default: '' },
    isAdmin:  { type: Boolean, default: false },

    // Account type
    accountType: {
      type:    String,
      enum:    ['Retail', 'Wholesale'],
      default: 'Retail',
    },

    // Business info (for Wholesale accounts)
    businessInfo: {
      businessName: { type: String, default: '' },
      kraPin:       { type: String, default: '' },
      bizType:      { type: String, default: 'Sole Proprietor' },
    },

    // Notification preferences
    notificationPreferences: {
      orderUpdates: { type: Boolean, default: true },
      promotions:   { type: Boolean, default: true },
      restock:      { type: Boolean, default: false },
    },

    // Wishlist
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    // ── Security fields (required for 2FA system) ──────────────────────────
    passwordChangedAt: { type: Date,    default: null },
    isDisabled:        { type: Boolean, default: false },
    disabledReason:    { type: String,  default: null },
    forcedLogoutAt:    { type: Date,    default: null },
    // phoneNumber is a dedicated E.164-formatted field for SMS OTPs
    // (phone above is the display/contact field — keep both)
    phoneNumber:       { type: String,  default: null },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

// ── Hash password before saving ────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance method: compare passwords ────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;