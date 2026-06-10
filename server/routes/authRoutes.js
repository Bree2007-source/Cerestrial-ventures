import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Notification from '../models/Notification.js'

const router = express.Router()

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.id
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body
    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ message: 'Email already in use' })

    const user = await User.create({ name, email, password, phone })
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

    // Notify admins about the new registration
    await Notification.create({
      isAdminNotification: true,
      title: 'New Customer Registered 👤',
      message: `${name} (${email}) just created an account.`,
      type: 'new_customer',
      link: '/admin',
    })

    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      phone: user.phone, isAdmin: user.isAdmin, token
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Invalid credentials' })

    const isMatch = await user.matchPassword(password)
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' })

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

    res.json({
      _id: user._id, name: user.name, email: user.email,
      phone: user.phone, isAdmin: user.isAdmin,
      notificationPreferences: user.notificationPreferences, token
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// UPDATE profile
router.put('/update', protect, async (req, res) => {
  try {
    const { name, email, phone } = req.body
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, email, phone },
      { new: true }
    ).select('-password')

    res.json({
      _id: user._id, name: user.name, email: user.email,
      phone: user.phone, isAdmin: user.isAdmin
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router