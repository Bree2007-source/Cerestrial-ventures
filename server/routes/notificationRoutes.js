import express from 'express'
import Notification from '../models/Notification.js'
import { protect } from '../middleware/adminMiddleware.js'

const router = express.Router()

function buildQuery(user, extraFilter = {}) {
  if (user.isAdmin) {
    return {
      ...extraFilter,
      $or: [{ userId: user._id }, { isAdminNotification: true }],
    }
  }
  return {
    ...extraFilter,
    userId: user._id,
    isAdminNotification: false,
    driverId: null,
  }
}

// GET /api/notifications
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find(buildQuery(req.user))
      .sort({ createdAt: -1 })
      .limit(50)
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/notifications/unread-count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments(buildQuery(req.user, { read: false }))
    res.json({ count })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PATCH /api/notifications/mark-all-read  ← must be before /:id/read
router.patch('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(buildQuery(req.user, { read: false }), { read: true })
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...buildQuery(req.user) },
      { read: true },
      { new: true }
    )
    if (!notification) return res.status(404).json({ message: 'Notification not found' })
    res.json(notification)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// DELETE /api/notifications/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete(
      { _id: req.params.id, ...buildQuery(req.user) }
    )
    if (!notification) return res.status(404).json({ message: 'Notification not found' })
    res.json({ message: 'Deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router