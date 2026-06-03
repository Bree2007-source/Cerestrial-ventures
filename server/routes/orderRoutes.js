import express from 'express'
import Order from '../models/Order.js'

const router = express.Router()

// GET all orders — Admin dashboard
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 })
    res.json(orders)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST create new order — Checkout page
router.post('/', async (req, res) => {
  try {
    const { customerName, phone, location, items, totalAmount } = req.body

    const order = await Order.create({
      customerName,
      phone,
      location,
      items,
      totalAmount,
      status: 'Pending'
    })

    res.status(201).json(order)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PATCH update order status — Admin dashboard dropdown
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET single order — Order tracking page
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router