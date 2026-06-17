import express from 'express'
import Notification from '../models/Notification.js'
import { protect } from '../middleware/adminMiddleware.js'

const router = express.Router()

// GET /api/notifications
// Returns notifications for the logged-in user
router.get('/', protect, async (req, res) => {
  try {
    let query

    if (req.user.isAdmin) {
      query = {
        $or: [
          { userId: req.user._id },
          { isAdminNotification: true }
        ]
      }
    } else {
      query = { userId: req.user._id, isAdminNotification: false }
    }

    const notifications = await Notification.find(query)
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
    let query

    if (req.user.isAdmin) {
      query = {
        read: false,
        $or: [
          { userId: req.user._id },
          { isAdminNotification: true }
        ]
      }
    } else {
      query = { userId: req.user._id, isAdminNotification: false, read: false }
    }

    const count = await Notification.countDocuments(query)
    res.json({ count })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const query = req.user.isAdmin
      ? {
          _id: req.params.id,
          $or: [
            { userId: req.user._id },
            { isAdminNotification: true }
          ]
        }
      : { _id: req.params.id, userId: req.user._id, isAdminNotification: false }

    const notification = await Notification.findOneAndUpdate(
      query,
      { read: true },
      { new: true }
    )

    if (!notification) return res.status(404).json({ message: 'Notification not found' })
    res.json(notification)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PATCH /api/notifications/mark-all-read
router.patch('/mark-all-read', protect, async (req, res) => {
  try {
    let query

    if (req.user.isAdmin) {
      query = {
        read: false,
        $or: [
          { userId: req.user._id },
          { isAdminNotification: true }
        ]
      }
    } else {
      query = { userId: req.user._id, isAdminNotification: false, read: false }
    }

    await Notification.updateMany(query, { read: true })
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router