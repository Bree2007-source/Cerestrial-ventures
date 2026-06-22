// server/routes/userRoutes.js
// Add / merge these routes into your existing user router

import express from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { protect } from '../middleware/authMiddleware.js' // your existing auth middleware

const router = express.Router()

// ── GET /api/users/profile ─────────────────────────────────────────────────
// Returns the logged-in user's full profile including createdAt
router.get('/profile', protect, async (req, res) => {
  try {
    // .select('-password') so we never send the hash to the client
    const user = await User.findById(req.user._id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })

    res.json({
      _id:          user._id,
      name:         user.name,
      email:        user.email,
      phone:        user.phone,
      isAdmin:      user.isAdmin,
      accountType:  user.accountType || 'Retail',
      businessInfo: user.businessInfo || null,
      notificationPreferences: user.notificationPreferences,
      wishlist:     user.wishlist,
      // ✅ ISO timestamp — formatMemberSince() on the frontend will display it nicely
      createdAt:    user.createdAt,
      updatedAt:    user.updatedAt,
    })
  } catch (err) {
    console.error('GET /profile error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/users/profile ─────────────────────────────────────────────────
// Update name, email, phone, accountType, businessInfo
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const { name, email, phone, accountType, businessInfo } = req.body

    if (name)         user.name        = name
    if (email)        user.email       = email
    if (phone !== undefined) user.phone = phone
    if (accountType)  user.accountType = accountType
    if (businessInfo) user.businessInfo = businessInfo

    const updated = await user.save()

    res.json({
      _id:          updated._id,
      name:         updated.name,
      email:        updated.email,
      phone:        updated.phone,
      accountType:  updated.accountType,
      businessInfo: updated.businessInfo,
      createdAt:    updated.createdAt,
      updatedAt:    updated.updatedAt,
    })
  } catch (err) {
    console.error('PUT /profile error:', err)
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

    user.password = newPassword  // pre-save hook hashes it
    await user.save()

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('PUT /change-password error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/users/notifications ──────────────────────────────────────────
// (Your existing endpoint — kept here for completeness)
router.put('/notifications', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.notificationPreferences = {
      orderUpdates: req.body.orderUpdates ?? user.notificationPreferences?.orderUpdates ?? true,
      promotions:   req.body.promotions   ?? user.notificationPreferences?.promotions   ?? true,
      restock:      req.body.restock      ?? user.notificationPreferences?.restock      ?? false,
    }
    await user.save()
    res.json({ message: 'Preferences saved', notificationPreferences: user.notificationPreferences })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router