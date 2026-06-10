import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  location: { type: String, required: true },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  deliveryTime: { type: String, default: 'Today' },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'M-Pesa'],
    default: 'Cash'
  },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    }
  ],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: [
      'Pending', 'Order Received', 'Payment Confirmed', 'Paid',
      'Processing Order', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'
    ],
    default: 'Order Received'
  },
  mpesaCode: { type: String, default: '' },
  coupon: {
    code: { type: String },
    discountType: { type: String, enum: ['percent', 'fixed'] },
    value: { type: Number }
  },
  driver: {
    name: { type: String },
    phone: { type: String },
    vehicle: { type: String },
  },
  driverLocation: {
    lat: { type: Number },
    lng: { type: Number },
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

orderSchema.index({ userId: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;