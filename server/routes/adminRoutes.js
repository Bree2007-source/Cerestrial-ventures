import express from 'express';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Get all orders
router.get('/orders', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get dashboard analytics
router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({});
    const totalRevenueResult = await Order.aggregate([
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.revenue || 0;
    const monthlySales = await Order.aggregate([
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    const topProducts = await Product.find({}).sort({ rating: -1, numReviews: -1 }).limit(6);
    const activeAdmins = await User.countDocuments({ isAdmin: true });
    const recentActivity = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(10).populate('adminId', 'name email');

    res.json({ totalOrders, totalRevenue, monthlySales, topProducts, activeAdmins, recentActivity });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get recent admin activity logs
router.get('/activity', protect, adminOnly, async (req, res) => {
  try {
    const logs = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(50).populate('adminId', 'name email');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update delivery status
router.put('/orders/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.deliveryStatus || req.body.status },
      { new: true }
    );
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add new product
router.post('/products', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete product
router.delete('/products/:id', protect, adminOnly, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;