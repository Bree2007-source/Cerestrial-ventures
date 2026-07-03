import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  vehicleType: { type: String },
  vehicleRegistration: { type: String },
  status: { type: String, enum: ['Available', 'On Delivery', 'Offline'], default: 'Available' },
  isActive: { type: Boolean, default: true },
  currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
    updatedAt: { type: Date }   // required for routeOptimizer's staleness check to ever pass
  },
  completedDeliveries: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 }
}, { timestamps: true });

// ── Hash password before saving — mirrors User.js exactly (bcryptjs, 12 rounds) ──
driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance method: compare passwords — same interface as User.js ──────────
driverSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('Driver', driverSchema);