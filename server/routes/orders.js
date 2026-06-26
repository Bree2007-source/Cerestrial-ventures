import express from 'express';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';

const router = express.Router();

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ── POST /orders ─────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      customerName, phone, email, location,
      latitude, longitude, deliveryTime,
      paymentMethod, items, totalAmount,
      status, mpesaCode, coupon,
    } = req.body;

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id || decoded._id || decoded.userId;
      } catch {}
    }

    const order = new Order({
      customerName, phone, email, location,
      latitude: latitude || null,
      longitude: longitude || null,
      deliveryTime: deliveryTime || 'Today',
      paymentMethod: paymentMethod || 'Cash',
      items, totalAmount,
      status: status || 'Order Received',
      mpesaCode: mpesaCode || '',
      coupon: coupon || undefined,
      userId: userId || null,
    });

    const saved = await order.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Order save error:', err);
    res.status(500).json({ message: 'Failed to save order', error: err.message });
  }
});

// ── GET /orders/my ── MUST be before /:id ────────────────────────
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const userEmail = req.user.email;
    const query = userEmail
      ? { $or: [{ userId }, { email: userEmail }] }
      : { userId };
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Fetch my orders error:', err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// ── GET /orders/debug ── MUST be before /:id ─────────────────────
router.get('/debug', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const allOrders = await Order.find().sort({ createdAt: -1 }).limit(5)
      .select('customerName userId email createdAt');
    res.json({ tokenUserId: userId, recentOrders: allOrders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /orders ── all orders (admin) ────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// ── GET /orders/:id ── MUST be after /my and /debug ──────────────
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error tracking order' });
  }
});

// ── PATCH /orders/:id/status ─────────────────────────────────────
router.patch('/:id/status', authenticate, async (req, res) => {
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

export default router;