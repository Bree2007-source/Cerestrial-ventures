const express = require('express');
const router = express.Router();
// Assuming you have an Order schema model set up
const Order = require('../models/Order'); 

// GET order status by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({
      _id: order._id,
      status: order.status, // e.g., 'Pending', 'Processing', 'Out for Delivery', 'Delivered'
      totalAmount: order.totalAmount,
      itemsCount: order.items.length,
      deliveryTime: order.deliveryTime
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error tracking order' });
  }
});

module.exports = router;