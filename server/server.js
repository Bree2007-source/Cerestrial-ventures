import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import { Server } from 'socket.io'

// Import Routes
import authRoutes from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import userRoutes from './routes/userRoutes.js'
import couponRoutes from './routes/couponRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import paymentRoutes from './routes/payment.js'
import User from './models/User.js'

// ESM handling
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// ✅ Create HTTP server from Express app
const httpServer = http.createServer(app)

// ✅ Attach Socket.io to the HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: [/^http:\/\/localhost(:\d+)?$/],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
})

// ✅ Make io accessible in all routes via req.app.get('io')
app.set('io', io)

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('🟢 Customer connected via socket:', socket.id)

  // Customer joins a room for their specific order
  socket.on('join_order', (orderId) => {
    socket.join(orderId)
    console.log(`📦 Socket ${socket.id} is now tracking order: ${orderId}`)
  })

  socket.on('disconnect', () => {
    console.log('🔴 Customer disconnected:', socket.id)
  })
})

// Middleware
app.use(cors({ 
  origin: [/^http:\/\/localhost(:\d+)?$/], 
  credentials: true 
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Health Check
app.get('/', (req, res) => {
  res.send('🚀 Cerestrial Ventures API is running operational!')
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', userRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/payments', paymentRoutes)

// Global Error Handler
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
        password: 'admin123',
        isAdmin: true
      })
      await admin.save()
      console.log('✅ Default admin user created: admin@cerestrial.com / admin123')
    } else if (!existingAdmin.isAdmin) {
      existingAdmin.isAdmin = true
      await existingAdmin.save()
      console.log('✅ Existing admin user updated with isAdmin=true')
    }
  } catch (error) {
    console.error('❌ Admin bootstrap error:', error.message)
  }
}

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cerestrial')
  .then(async () => {
    console.log('✅ Connected safely to MongoDB.')
    await ensureAdminUser()

    // ✅ Use httpServer.listen instead of app.listen
    httpServer.listen(PORT, () => {
      console.log(`🚀 Cerestrial Backend running on port ${PORT}`)
      console.log(`🔌 Socket.io is active and listening`)
    })
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err.message)
  })