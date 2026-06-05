import express from 'express'
import Coupon from '../models/Coupon.js'
import { protect, adminOnly } from '../middleware/adminMiddleware.js'
import ActivityLog from '../models/ActivityLog.js'

const router = express.Router()

const logActivity = async (req, action, resource, details = {}) => {
  const adminId = req.user?._id
  await ActivityLog.create({ adminId, action, resource, details, ip: req.ip })
}

// GET all coupons (admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const coupons = await Coupon.find({})
    res.json(coupons)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST create coupon (admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body)
    await logActivity(req, 'created_coupon', 'Coupon', { couponId: coupon._id, code: coupon.code })
    res.status(201).json(coupon)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET validate coupon
router.get('/:code', async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase(), active: true })
    if (!coupon) return res.status(404).json({ message: 'Coupon not found or inactive' })

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Coupon has expired' })
    }

    if (coupon.usesLeft !== null && coupon.usesLeft <= 0) {
      return res.status(400).json({ message: 'Coupon no longer valid' })
    }

    res.json(coupon)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
