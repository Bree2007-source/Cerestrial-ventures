import express from 'express'
import User from '../models/User.js'
import Product from '../models/Product.js'
import { protect, adminOnly } from '../middleware/adminMiddleware.js'
import ActivityLog from '../models/ActivityLog.js'

const router = express.Router()

const logActivity = async (req, action, resource, details = {}) => {
  const adminId = req.user?._id
  await ActivityLog.create({ adminId, action, resource, details, ip: req.ip })
}

// GET user wishlist
router.get('/wishlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist')
    res.json(user.wishlist || [])
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST toggle wishlist item
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

// GET all admins
router.put('/notifications', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const { orderUpdates, promotions, restock } = req.body
    user.notificationPreferences = {
      orderUpdates: typeof orderUpdates === 'boolean' ? orderUpdates : user.notificationPreferences.orderUpdates,
      promotions: typeof promotions === 'boolean' ? promotions : user.notificationPreferences.promotions,
      restock: typeof restock === 'boolean' ? restock : user.notificationPreferences.restock,
    }

    await user.save()
    res.json({ message: 'Notification preferences updated', notificationPreferences: user.notificationPreferences })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/admins', protect, adminOnly, async (req, res) => {
  try {
    const admins = await User.find({ isAdmin: true }).select('-password')
    res.json(admins)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PUT update admin privileges
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
