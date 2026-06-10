import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
dotenv.config()

await mongoose.connect(process.env.MONGO_URI)

const hashed = await bcrypt.hash('admin123', 10)
await mongoose.connection.collection('users').updateOne(
  { email: 'admin@celestrial.com' },
  { $set: { password: hashed, isAdmin: true } }
)

console.log('✅ Password reset to admin123 and isAdmin set to true')
await mongoose.connection.close()
