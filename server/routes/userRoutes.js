import express from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Product from '../models/Product.js'
import { protect } from '../middleware/authMiddleware.js'
import { adminOnly } from '../middleware/adminMiddleware.js'
import ActivityLog from '../models/ActivityLog.js'

const router = express.Router()

const logActivity = async (req, action, resource, details = {}) => {
  const adminId = req.user?._id
  await ActivityLog.create({ adminId, action, resource, details, ip: req.ip })
}

// ── GET /api/users/profile ─────────────────────────────────────────────────
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({
      _id:                     user._id,
      name:                    user.name,
      email:                   user.email,
      phone:                   user.phone,
      isAdmin:                 user.isAdmin,
      accountType:             user.accountType || 'Retail',
      businessInfo:            user.businessInfo || null,
      notificationPreferences: user.notificationPreferences,
      wishlist:                user.wishlist,
      location:                user.location || null,   // ← include saved location
      createdAt:               user.createdAt,
      updatedAt:               user.updatedAt,
    })
  } catch (err) {
    console.error('GET /profile error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/users/profile ─────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    const { name, email, phone, accountType, businessInfo } = req.body
    if (name)  user.name  = name
    if (email) user.email = email
    if (phone !== undefined) user.phone = phone
    if (accountType)  user.accountType  = accountType
    if (businessInfo) user.businessInfo = businessInfo
    const updated = await user.save()
    res.json({
      _id:          updated._id,
      name:         updated.name,
      email:        updated.email,
      phone:        updated.phone,
      accountType:  updated.accountType,
      businessInfo: updated.businessInfo,
      location:     updated.location || null,
      createdAt:    updated.createdAt,
      updatedAt:    updated.updatedAt,
    })
  } catch (err) {
    console.error('PUT /profile error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PATCH /api/users/location ──────────────────────────────────────────────
// Called silently after login/register to store the customer's GPS location.
// Also used at checkout when the customer refreshes or moves the pin.
router.patch('/location', protect, async (req, res) => {
  try {
    const { lat, lng, address } = req.body
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat and lng are required' })
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { location: { lat, lng, address: address || `${lat}, ${lng}`, updatedAt: new Date() } },
      { new: true }
    ).select('-password')
    res.json({
      message:  'Location saved',
      location: user.location,
    })
  } catch (err) {
    console.error('PATCH /location error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/users/change-password ────────────────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: 'Both passwords are required' })
    const user = await User.findById(req.user._id)
    const match = await user.matchPassword(oldPassword)
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' })
    user.password = newPassword
    await user.save()
    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('PUT /change-password error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/users/wishlist ───────────────────────────────────────────────
router.get('/wishlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist')
    res.json(user.wishlist || [])
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// ── POST /api/users/wishlist/:productId ───────────────────────────────────
router.post('/wishlist/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const product = await Product.findById(req.params.productId)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    const index = user.wishlist.findIndex((id) => id.toString() === product._id.toString())
    if (index === -1) {
      user.wishlist.push(product._id)
      await user.save()
      return res.json({ message: 'Added to wishlist', wishlist: user.wishlist })
    }
    user.wishlist.splice(index, 1)
    await user.save()
    res.json({ message: 'Removed from wishlist', wishlist: user.wishlist })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// ── PUT /api/users/notifications ──────────────────────────────────────────
router.put('/notifications', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    const { orderUpdates, promotions, restock } = req.body
    user.notificationPreferences = {
      orderUpdates: typeof orderUpdates === 'boolean' ? orderUpdates : user.notificationPreferences.orderUpdates,
      promotions:   typeof promotions   === 'boolean' ? promotions   : user.notificationPreferences.promotions,
      restock:      typeof restock      === 'boolean' ? restock      : user.notificationPreferences.restock,
    }
    await user.save()
    res.json({ message: 'Notification preferences updated', notificationPreferences: user.notificationPreferences })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// ── GET /api/users/admins ─────────────────────────────────────────────────
router.get('/admins', protect, adminOnly, async (req, res) => {
  try {
    const admins = await User.find({ isAdmin: true }).select('-password')
    res.json(admins)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// ── PUT /api/users/admins/:id ─────────────────────────────────────────────
router.put('/admins/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    user.isAdmin = Boolean(req.body.isAdmin)
    await user.save()
    await logActivity(req, 'updated_admin_role', 'User', { userId: user._id, isAdmin: user.isAdmin })
    res.json({ message: 'Admin role updated', user: { _id: user._id, email: user.email, isAdmin: user.isAdmin } })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router