import express from 'express';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { protect, adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Get all orders
router.get('/orders', protect, adminOnly, async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('customer', 'name email phone')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update delivery status
router.put('/orders/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { deliveryStatus: req.body.deliveryStatus },
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