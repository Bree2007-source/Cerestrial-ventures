import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  retailPrice: { type: Number, required: true },
  wholesalePrice: { type: Number, required: true },
  image: { type: String, required: true },
  description: { type: String },
  brand: { type: String },
  countInStock: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  minWholesaleQuantity: { type: Number, default: 10 },
}, { timestamps: true })

const Product = mongoose.model('Product', productSchema)

export default Product