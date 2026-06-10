const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// POST - Create new order
router.post('/', async (req, res) => {
  try {
    const {
      customerName, phone, email, location,
      latitude, longitude, deliveryTime,
      paymentMethod, items, totalAmount,
      status, mpesaCode, userId,
    } = req.body;

    const order = new Order({
      customerName, phone, email, location,
      latitude: latitude || null,
      longitude: longitude || null,
      deliveryTime, paymentMethod, items, totalAmount,
      status: status || 'Order Received',
      mpesaCode, userId,
    });

    const saved = await order.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Order save error:', err);
    res.status(500).json({ message: 'Failed to save order' });
  }
});

// GET - All orders (admin)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// GET - My orders (customer)
router.get('/my', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const orders = await Order.find({ userId: decoded.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// GET - Single order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({
      _id: order._id,
      status: order.status,
      totalAmount: order.totalAmount,
      itemsCount: order.items.length,
      deliveryTime: order.deliveryTime,
      location: order.location,
      latitude: order.latitude,
      longitude: order.longitude,
      items: order.items,
      createdAt: order.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error tracking order' });
  }
});

// PATCH - Update order status (admin)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

module.exports = router;