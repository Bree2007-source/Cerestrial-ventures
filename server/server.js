import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import cookieParser from 'cookie-parser'
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
import passwordResetRoutes from './routes/passwordResetRoutes.js'
import securityRoutes from './routes/securityRoutes.js'
import driverRoutes from './routes/driverRoutes.js'

import User from './models/User.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const app        = express()
const httpServer = http.createServer(app)

const PORT = process.env.PORT || 5000

// ── Allowed origins ────────────────────────────────────────────────────────
// Netlify entries kept even though that account is over its limit right
// now — harmless to leave them, and it means nothing breaks again if you
// resume that account later. Vercel entries added for the new frontend
// host: one for the production domain, one regex covering every preview
// deploy URL Vercel auto-generates per branch/PR.
//
// IMPORTANT: this assumes the Vercel project is named "cerestrial-ventures".
// If you name it anything else when creating the project, this regex won't
// match and every request from the live site will get CORS-blocked — swap
// "cerestrial-ventures" below for whatever the actual project name is.
const allowedOrigins = [
  /^http:\/\/localhost(:\d+)?$/,
  'https://aesthetic-chimera-0d58ee.netlify.app',
  'https://cerestrial-ventures.netlify.app',
  /^https:\/\/[a-z0-9]+--cerestrial-ventures\.netlify\.app$/,
  /^https:\/\/[a-z0-9]+-cerestrial-ventures\.netlify\.app$/,
  // Vercel — production domain + every preview deploy Vercel generates
  /^https:\/\/cerestrial-ventures(-[a-z0-9]+)?(-[a-z0-9]+)?\.vercel\.app$/,
]

const corsOptions = {
  origin:      allowedOrigins,
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}

// ── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(httpServer, { cors: corsOptions })
app.set('io', io)

io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id)

  // Customer tracks their order
  socket.on('join_order', (orderId) => {
    socket.join(orderId)
    console.log(`📦 Tracking order: ${orderId}`)
  })

  // Driver joins their room
  socket.on('join_driver', (driverId) => {
    socket.join(`driver_${driverId}`)
    console.log(`🚗 Driver ${driverId} joined`)
  })

  // Admin joins admin room
  socket.on('join_admin', () => {
    socket.join('admin_room')
    console.log(`🛡️ Admin joined`)
  })

  // Driver updates location
  socket.on('driver_location_update', (data) => {
    const { driverId, lat, lng, orderId } = data
    // Broadcast to customer tracking this order
    if (orderId) {
      io.to(orderId).emit('driver_location', { lat, lng, driverId })
    }
    // Broadcast to admin
    io.to('admin_room').emit('driver_location_update', { driverId, lat, lng })
  })

  // Order status update
  socket.on('order_status_update', (data) => {
    const { orderId, status, driverName } = data
    io.to(orderId).emit('order_status_changed', { orderId, status, driverName })
    io.to('admin_room').emit('order_updated', { orderId, status })
  })

  socket.on('disconnect', () => {
    console.log('🔴 Disconnected:', socket.id)
  })
})

// ── Core middleware ────────────────────────────────────────────────────────
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── Health check ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('🚀 Cerestrial Ventures API is running!')
})

// ── Request logger ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes)
app.use('/api/products',       productRoutes)
app.use('/api/orders',         orderRoutes)
app.use('/api/admin',          adminRoutes)
app.use('/api/users',          userRoutes)
app.use('/api/coupons',        couponRoutes)
app.use('/api/upload',         uploadRoutes)
app.use('/api/payments',       paymentRoutes)
app.use('/api/notifications',  notificationRoutes)
app.use('/api/password-reset', passwordResetRoutes)
app.use('/api/security',       securityRoutes)
app.use('/api/drivers',        driverRoutes)

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err?.stack || String(err))
  if (err?.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ success: false, message: 'File too large. Max 5MB.' })
  if (err?.name === 'MulterError')
    return res.status(400).json({ success: false, message: 'Upload error: ' + err.message })
  res.status(err?.status || 500).json({
    success: false,
    message: err?.message || 'Internal Server Error',
  })
})

// ── Admin bootstrap ────────────────────────────────────────────────────────
const ensureAdminUser = async () => {
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  ADMIN_PASSWORD not set — skipping admin bootstrap.')
    return
  }
  try {
    const existing = await User.findOne({ email: 'admin@cerestrial.com' })
    if (!existing) {
      const admin = new User({
        name:     'Admin',
        email:    'admin@cerestrial.com',
        password: process.env.ADMIN_PASSWORD,
        isAdmin:  true,
      })
      await admin.save()
      console.log('✅ Default admin created: admin@cerestrial.com')
    } else if (!existing.isAdmin) {
      existing.isAdmin = true
      await existing.save()
      console.log('✅ Existing user promoted to admin')
    }
  } catch (err) {
    console.error('❌ Admin bootstrap error:', err.message)
  }
}

// ── Database + server start ────────────────────────────────────────────────
if (!process.env.MONGO_URI) {
  console.warn('⚠️  WARNING: MONGO_URI is missing from .env!')
}

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cerestrial')
  .then(async () => {
    console.log('✅ Connected to MongoDB.')
    await ensureAdminUser()

    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} already in use.`)
        return process.exit(1)
      }
      console.error('❌ HTTP server error:', err)
      process.exit(1)
    })

    httpServer.listen(PORT, () => {
      console.log(`🚀 Backend running on port ${PORT}`)
      console.log(`🔌 Socket.io active`)
    })
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  })