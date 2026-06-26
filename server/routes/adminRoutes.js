/**
 * server/routes/adminRoutes.js
 *
 * Full admin API — replace your existing adminRoutes.js with this file.
 *
 * Endpoints:
 *   GET  /admin/analytics        — dashboard KPIs
 *   GET  /admin/orders           — all orders (with optional filters)
 *   PUT  /admin/orders/:id/status
 *   GET  /admin/customers        — all registered customers
 *   GET  /admin/inventory        — stock summary
 *   GET  /admin/sales-summary    — aggregated product sales in a date range
 *   GET  /admin/activity         — recent admin activity log
 *   POST /admin/promotions       — broadcast promo email (delegates to existing route)
 */

import express from 'express';
import Order       from '../models/Order.js';
import Product     from '../models/Product.js';
import User        from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import { protect, adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Apply auth to every admin route
router.use(protect, adminOnly);

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/analytics
// Returns the numbers used by the Overview KPI cards.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const [
      totalOrders,
      revenueResult,
      deliveredCount,
      pendingCount,
      productCount,
      customerCount,
      recentOrders,
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.aggregate([
        { $match: { status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments({ status: 'Delivered' }),
      Order.countDocuments({ status: { $in: ['Pending', 'Order Received'] } }),
      Product.countDocuments({}),
      User.countDocuments({ isAdmin: false, isDisabled: { $ne: true } }),
      Order.find({}).sort({ createdAt: -1 }).limit(10).select('customerName totalAmount status createdAt'),
    ]);

    const totalRevenue = revenueResult[0]?.revenue || 0;

    // Monthly aggregates — last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlySales = await Order.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo }, status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          count:   { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Low-stock products
    const lowStock = await Product.find({ countInStock: { $lte: 5 } })
      .select('name countInStock category')
      .sort({ countInStock: 1 });

    // Today's figures
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({ createdAt: { $gte: todayStart } });
    const todayRevenueResult = await Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
    ]);
    const todayRevenue = todayRevenueResult[0]?.revenue || 0;

    res.json({
      totalOrders,
      totalRevenue,
      deliveredCount,
      pendingCount,
      productCount,
      customerCount,
      todayOrders,
      todayRevenue,
      monthlySales,
      lowStock,
      recentOrders,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/orders
// Optional query params: status, from, to, search (name/phone/email)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const { status, from, to, search } = req.query;
    const filter = {};

    if (status) filter.status = status;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   { const end = new Date(to); end.setHours(23, 59, 59, 999); filter.createdAt.$lte = end; }
    }

    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ customerName: re }, { phone: re }, { email: re }];
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /admin/orders/:id/status
// ─────────────────────────────────────────────────────────────────────────────
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'status is required' });

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Log the action
    await ActivityLog.create({
      adminId: req.user._id || req.user.id,
      action:  `Updated order #${order._id.toString().slice(-6).toUpperCase()} status to "${status}"`,
    }).catch(() => {}); // non-fatal

    // Emit real-time event if socket.io is set up
    const io = req.app.get('io');
    if (io) io.emit('order:statusUpdate', { orderId: order._id, status });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/customers
// Returns all non-admin users.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/customers', async (req, res) => {
  try {
    const customers = await User.find({ isAdmin: false })
      .select('name email phone accountType businessInfo createdAt isDisabled')
      .sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/inventory
// Returns products with extra stock-health fields.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/inventory', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ countInStock: 1 });
    const enriched = products.map(p => ({
      ...p.toObject(),
      stockStatus: p.countInStock === 0 ? 'out' : p.countInStock <= 5 ? 'low' : 'ok',
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/sales-summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Aggregates completed order items into a per-product sales report.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/sales-summary', async (req, res) => {
  try {
    const { from, to } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   { const end = new Date(to); end.setHours(23, 59, 59, 999); dateFilter.$lte = end; }

    const matchStage = {
      status: { $in: ['Delivered', 'Paid', 'Payment Confirmed'] },
    };
    if (Object.keys(dateFilter).length) matchStage.createdAt = dateFilter;

    const summary = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id:        '$items.name',
          totalQty:   { $sum: '$items.quantity' },
          totalRev:   { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          name:       '$_id',
          totalQty:   1,
          totalRev:   1,
          orderCount: { $size: '$orderCount' },
        },
      },
      { $sort: { totalRev: -1 } },
    ]);

    // Attach current stock from products collection
    const productNames = summary.map(s => s.name);
    const stocks = await Product.find({ name: { $in: productNames } }).select('name countInStock');
    const stockMap = Object.fromEntries(stocks.map(p => [p.name, p.countInStock]));

    const enriched = summary.map(s => ({
      ...s,
      currentStock: stockMap[s.name] ?? null,
    }));

    // Totals
    const totals = {
      qty:     enriched.reduce((sum, r) => sum + r.totalQty, 0),
      revenue: enriched.reduce((sum, r) => sum + r.totalRev, 0),
      orders:  new Set(enriched.flatMap(() => [])).size,
    };

    res.json({ summary: enriched, totals, from, to });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/activity
// Recent admin action log.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const logs  = await ActivityLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('adminId', 'name email');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /admin/customers/:id/disable  |  /admin/customers/:id/enable
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/customers/:id/disable', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDisabled: true, disabledReason: req.body.reason || 'Disabled by admin' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/customers/:id/enable', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDisabled: false, disabledReason: null },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;