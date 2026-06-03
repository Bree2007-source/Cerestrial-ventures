import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import Product from './models/Product.js'

const products = [
  {
    name: 'Mumias Sugar 2kg',
    category: 'Sugar',
    retailPrice: 230,
    wholesalePrice: 210,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500',
    description: 'Premium white sugar from Mumias Sugar Company.',
    brand: 'Mumias',
    countInStock: 50,
    rating: 4.5,
    numReviews: 20,
  },
  {
    name: 'Pishori Rice 5kg',
    category: 'Rice',
    retailPrice: 750,
    wholesalePrice: 700,
    image: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=500',
    description: 'Premium Pishori rice, soft and aromatic.',
    brand: 'Kenya Rice',
    countInStock: 30,
    rating: 4.8,
    numReviews: 15,
  },
  {
    name: 'Elianto Cooking Oil 2L',
    category: 'Cooking Oil',
    retailPrice: 480,
    wholesalePrice: 450,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500',
    description: 'Pure sunflower cooking oil.',
    brand: 'Elianto',
    countInStock: 40,
    rating: 4.6,
    numReviews: 18,
  },
  {
    name: 'Jogoo Maize Flour 2kg',
    category: 'Maize Flour',
    retailPrice: 180,
    wholesalePrice: 160,
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500',
    description: 'Finely ground maize flour for ugali.',
    brand: 'Jogoo',
    countInStock: 60,
    rating: 4.7,
    numReviews: 25,
  },
  {
    name: 'Exe Wheat Flour 2kg',
    category: 'Wheat Flour',
    retailPrice: 210,
    wholesalePrice: 190,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
    description: 'Premium wheat flour for chapati.',
    brand: 'Exe',
    countInStock: 45,
    rating: 4.5,
    numReviews: 12,
  },
  {
    name: 'Quaker Oats 500g',
    category: 'Cereals',
    retailPrice: 280,
    wholesalePrice: 255,
    image: 'https://images.unsplash.com/photo-1495214783159-3503fd1b572d?w=500',
    description: 'Nutritious rolled oats for a healthy breakfast.',
    brand: 'Quaker',
    countInStock: 35,
    rating: 4.9,
    numReviews: 30,
  },
  {
    name: 'Lays Crisps 100g',
    category: 'Snacks',
    retailPrice: 80,
    wholesalePrice: 65,
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500',
    description: 'Crispy and delicious potato chips.',
    brand: 'Lays',
    countInStock: 100,
    rating: 4.4,
    numReviews: 40,
  },
  {
    name: 'Tusker Malt 500ml',
    category: 'Beverages',
    retailPrice: 120,
    wholesalePrice: 100,
    image: 'https://images.unsplash.com/photo-1624552184280-9e9b8832f1c7?w=500',
    description: 'Refreshing malt beverage.',
    brand: 'Tusker',
    countInStock: 80,
    rating: 4.6,
    numReviews: 22,
  },
  {
    name: 'Ariel Detergent 1kg',
    category: 'Cleaning Products',
    retailPrice: 320,
    wholesalePrice: 290,
    image: 'https://images.unsplash.com/photo-1585264550248-1778be3b5678?w=500',
    description: 'Powerful laundry detergent.',
    brand: 'Ariel',
    countInStock: 25,
    rating: 4.7,
    numReviews: 17,
  },
  {
    name: 'Pampers Diapers Size 3',
    category: 'Baby Products',
    retailPrice: 950,
    wholesalePrice: 900,
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500',
    description: 'Soft and absorbent baby diapers.',
    brand: 'Pampers',
    countInStock: 20,
    rating: 4.9,
    numReviews: 35,
  },
]

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to database for seeding...')

    await Product.deleteMany()
    console.log('🗑️ Old products cleared.')

    await Product.insertMany(products)
    console.log('✅ 10 Cerestrial products seeded into MongoDB!')

    mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Seeding error:', error)
    process.exit(1)
  }
}

seedDatabase()