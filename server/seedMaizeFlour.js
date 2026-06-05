import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Product from './models/Product.js'

dotenv.config()

const maizeFlourProducts = [
  { name: 'Riri Ugali 2kg',        retailPrice: 1950, },
  { name: 'Riri Ugali 1kg',        retailPrice: 1980, },
  { name: 'Leah Premium 2kg',      retailPrice: 2070, },
  { name: 'Leah Premium 1kg',      retailPrice: 2090, },
  { name: 'Nice Premium 2kg',      retailPrice: 2280, },
  { name: 'Nice Premium 1kg',      retailPrice: 2300, },
  { name: 'Raha Premium 2kg',      retailPrice: 2280, },
  { name: 'Raha Premium 1kg',      retailPrice: 2300, },
  { name: 'Spenza 2kg',            retailPrice: 2150, },
  { name: 'Spenza 1kg',            retailPrice: 2180, },
  { name: 'Soko Ugali 2kg',        retailPrice: 1900, },
  { name: 'Soko Ugali 1kg',        retailPrice: 1920, },
  { name: '210 Ugali 2kg',         retailPrice: 1880, },
  { name: '210 Ugali 1kg',         retailPrice: 1900, },
  { name: 'Pembe Ugali 2kg',       retailPrice: 1900, },
  { name: 'Pembe Ugali 1kg',       retailPrice: 1920, },
  { name: 'Diamond Ugali 2kg',     retailPrice: 1600, },
  { name: 'Diamond Ugali 1kg',     retailPrice: 1630, },
  { name: 'Jasiri Ugali 2kg',      retailPrice: 1630, },
  { name: 'Jasiri Ugali 1kg',      retailPrice: 1650, },
  { name: 'Rania Ugali 2kg',       retailPrice: 1600, },
  { name: 'Rania Ugali 1kg',       retailPrice: 1630, },
  { name: 'Dhahabu Ugali 2kg',     retailPrice: 1570, },
  { name: 'Dhahabu Ugali 1kg',     retailPrice: 1600, },
  { name: 'Miale Ugali 2kg',       retailPrice: 1570, },
  { name: 'Miale Ugali 1kg',       retailPrice: 1600, },
].map(p => ({
  ...p,
  wholesalePrice: Math.round(p.retailPrice * 0.95),
  category: 'Maize Flour',
  description: `${p.name} - Premium quality maize flour`,
  countInStock: 100,
  image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400',
  brand: p.name.split(' ')[0],
  rating: 0,
  numReviews: 0,
}))

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cerestrial')
  .then(async () => {
    console.log('✅ Connected to MongoDB')

    // Delete existing maize flour products first to avoid duplicates
    await Product.deleteMany({ category: 'Maize Flour' })
    console.log('🗑️ Cleared old Maize Flour products')

    // Insert all new products
    await Product.insertMany(maizeFlourProducts)
    console.log(`✅ Added ${maizeFlourProducts.length} Maize Flour products!`)

    mongoose.disconnect()
  })
  .catch(err => {
    console.error('❌ Error:', err.message)
    mongoose.disconnect()
  })