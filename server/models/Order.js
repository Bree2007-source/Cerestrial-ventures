import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  items: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    }
  ],
  totalAmount: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Pending', 'Assigned to Driver', 'Driver On The Way', 'Arrived', 'Delivered', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  paymentMethod: { type: String, default: 'M-Pesa' },
  mpesaCode: { type: String, default: '' },
  mpesaCheckoutRequestId: { type: String, default: '' },
  cashReceived: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending'
  },
  paymentTime: { type: Date },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  driverName: { type: String, default: '' },
  receiptNumber: { type: String },
  receiptGenerated: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // ── Cutoff-time delivery scheduling ───────────────────────────────────────
  // Computed server-side at checkout from the current DeliverySettings
  // (server/utils/deliveryCutoff.js) — never trusted from the client.
  deliveryDate: { type: String, default: '' },          // 'YYYY-MM-DD'
  deliveryWindowStart: { type: String, default: '' },    // 'HH:MM', snapshot at order time
  deliveryWindowEnd: { type: String, default: '' },       // 'HH:MM', snapshot at order time
  cutoffTimeAtOrder: { type: String, default: '' },       // 'HH:MM', snapshot at order time
  deliveryScheduleStatus: {
    type: String,
    enum: ['TODAY', 'TOMORROW', 'SCHEDULED'],
    default: 'TODAY',
  },

  // ── Route optimization (multi-stop sequencing for a single driver) ───────
  routeSequence:    { type: Number, default: null },
  routeDistanceKm:  { type: Number, default: null },
  routeDurationMin: { type: Number, default: null },
  routeIsEstimate:  { type: Boolean, default: false },
  deliveryLocked:   { type: Boolean, default: true },
}, { timestamps: true })

orderSchema.index({ driver: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ mpesaCheckoutRequestId: 1 });
orderSchema.index({ deliveryDate: 1 });

orderSchema.pre('save', function(next) {
  if (!this.receiptNumber) {
    this.receiptNumber = 'CV-' + Math.random().toString(36).substring(2, 11).toUpperCase()
  }
  next()
})

const Order = mongoose.model('Order', orderSchema)
export default Order