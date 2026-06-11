import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import { Server } from 'socket.io'

import authRoutes from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import userRoutes from './routes/userRoutes.js'
import couponRoutes from './routes/couponRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import paymentRoutes from './routes/payment.js'
import notificationRoutes from './routes/notificationRoutes.js'
import User from './models/User.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: [/^http:\/\/localhost(:\d+)?$/],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
})

app.set('io', io)

io.on('connection', (socket) => {
  console.log('🟢 Customer connected via socket:', socket.id)

  socket.on('join_order', (orderId) => {
    socket.join(orderId)
    console.log(`📦 Socket ${socket.id} is now tracking order: ${orderId}`)
  })

  socket.on('disconnect', () => {
    console.log('🔴 Customer disconnected:', socket.id)
  })
})

app.use(cors({
  origin: [/^http:\/\/localhost(:\d+)?$/],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/', (req, res) => {
  res.send('🚀 Cerestrial Ventures API is running operational!')
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', userRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/notifications', notificationRoutes)

app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack)
  res.status(500).json({ success: false, message: 'Internal Server Error' })
})

const PORT = process.env.PORT || 5000

if (!process.env.MONGO_URI) {
  console.warn('⚠️ WARNING: MONGO_URI is missing from .env file!')
}

const ensureAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ email: 'admin@cerestrial.com' })
    if (!existingAdmin) {
      const admin = new User({
        name: 'Admin',
        email: 'admin@cerestrial.com',
        password: process.env.ADMIN_PASSWORD || 'Cerestrial@Admin2024!',
        isAdmin: true
      })
      await admin.save()
      console.log('✅ Default admin user created: admin@cerestrial.com')
    } else if (!existingAdmin.isAdmin) {
      existingAdmin.isAdmin = true
      await existingAdmin.save()
      console.log('✅ Existing user updated with isAdmin=true')
    }
  } catch (error) {
    console.error('❌ Admin bootstrap error:', error.message)
  }
}

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cerestrial')
  .then(async () => {
    console.log('✅ Connected safely to MongoDB.')
    await ensureAdminUser()

    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`)
        process.exit(1)
      }
      console.error('❌ Server error:', err)
      process.exit(1)
    })

    httpServer.listen(PORT, () => {
      console.log(`🚀 Cerestrial Backend running on port ${PORT}`)
      console.log(`🔌 Socket.io is active and listening`)
    })
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err.message)
  })