import express from 'express'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { protect, adminOnly } from '../middleware/adminMiddleware.js'
import { sendEmail } from '../utils/sendEmail.js';
import { sendSms } from '../utils/sendSms.js';
import { notifyAdmin } from '../utils/notifyHelpers.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({})
    res.json(products)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = await Product.find({})
      .sort({ rating: -1, numReviews: -1, countInStock: -1 })
      .limit(8)
    res.json(recommendations)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json(product)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.create(req.body)
    res.status(201).json(product)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const existingProduct = await Product.findById(req.params.id)
    if (!existingProduct) return res.status(404).json({ message: 'Product not found' })

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' })

    const prevStock = existingProduct.countInStock
    const nextStock = updatedProduct.countInStock
    const io = req.app.get('io')

    // Low stock alert
    if (nextStock <= 5 && nextStock < prevStock) {
      await notifyAdmin(io, {
        title:   '⚠️ Low Stock Alert',
        message: `${updatedProduct.name} is running low — only ${nextStock} unit${nextStock === 1 ? '' : 's'} left.`,
        type:    'low_stock',
        link:    '/admin',
      })
    }

    // Out of stock alert
    if (nextStock === 0 && prevStock > 0) {
      await notifyAdmin(io, {
        title:   '🚫 Out of Stock',
        message: `${updatedProduct.name} is now out of stock. Please restock soon.`,
        type:    'low_stock',
        link:    '/admin',
      })
    }

    // Back in stock — notify wishlist users
    if (prevStock === 0 && nextStock > 0) {
      const users = await User.find({
        'notificationPreferences.restock': true,
        wishlist: updatedProduct._id,
      })
      const restockMessage = `Good news! ${updatedProduct.name} is back in stock at Cerestrial Ventures.`
      await Promise.allSettled(users.map((user) => {
        const tasks = []
        if (user.phone) tasks.push(sendSms({ to: user.phone, message: restockMessage }))
        if (user.email) tasks.push(sendEmail({
          to: user.email,
          subject: `${updatedProduct.name} is back in stock!`,
          text: restockMessage,
          html: `<p>${restockMessage}</p>`,
        }))
        return Promise.all(tasks)
      }))
    }

    res.json(updatedProduct)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/promotions', protect, adminOnly, async (req, res) => {
  try {
    const { subject, message } = req.body
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' })
    }
    const users = await User.find({ 'notificationPreferences.promotions': true })
    await Promise.allSettled(users.map((user) => {
      const tasks = []
      if (user.phone) tasks.push(sendSms({ to: user.phone, message: `${subject}\n\n${message}` }))
      if (user.email) tasks.push(sendEmail({
        to: user.email, subject, text: message, html: `<p>${message}</p>`,
      }))
      return Promise.all(tasks)
    }))
    res.json({ message: 'Promotion broadcast sent', recipients: users.length })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ message: 'Product deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    const { rating, comment } = req.body
    if (!rating || !comment) return res.status(400).json({ message: 'Rating and comment are required' })
    const existingReview = product.reviews.find(
      (review) => review.user.toString() === req.user._id.toString()
    )
    if (existingReview) {
      existingReview.rating  = Number(rating)
      existingReview.comment = comment
    } else {
      product.reviews.push({ user: req.user._id, name: req.user.name, rating: Number(rating), comment })
    }
    product.numReviews = product.reviews.length
    product.rating     = product.reviews.reduce((sum, item) => sum + item.rating, 0) / product.reviews.length
    await product.save()
    res.status(201).json({ message: 'Review submitted successfully', reviews: product.reviews })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})
export { sendEmail };

export default router