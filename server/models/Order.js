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
  // NEW — set right after an STK push is sent for this order, so the
  // /api/mpesa/callback webhook can match Safaricom's async response back
  // to this exact order (Safaricom's callback only carries CheckoutRequestID).
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

  // ── Route optimization (multi-stop sequencing for a single driver) ───────
  // routeSequence: 0 = next/unlocked stop, 1 = locked stop 2, etc.
  // Recomputed any time a new order is assigned to the same driver, or an
  // order in the sequence is completed/cancelled.
  routeSequence:    { type: Number, default: null },
  routeDistanceKm:  { type: Number, default: null },   // road distance from previous point
  routeDurationMin: { type: Number, default: null },   // road travel time from previous point
  routeIsEstimate:  { type: Boolean, default: false },  // true if haversine fallback was used, not Google road distance
  deliveryLocked:   { type: Boolean, default: true },   // true until it's this order's turn (routeSequence === 0)
}, { timestamps: true })

// Optimized indexing for faster lookups in the Driver Panel
orderSchema.index({ driver: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ mpesaCheckoutRequestId: 1 });

// Auto-generate receipt number using modern substring
orderSchema.pre('save', function(next) {
  if (!this.receiptNumber) {
    this.receiptNumber = 'CV-' + Math.random().toString(36).substring(2, 11).toUpperCase()
  }
  next()
})

const Order = mongoose.model('Order', orderSchema)
export default Order