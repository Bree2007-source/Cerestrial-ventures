import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String, required: true },
  items: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    }
  ],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Processing', 'Out for Delivery', 'Delivered'],
    default: 'Pending'
  },
  mpesaCode: { type: String, default: '' },
}, { timestamps: true })

const Order = mongoose.model('Order', orderSchema)
export default Order