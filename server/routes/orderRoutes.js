import express from 'express'
import PDFDocument from 'pdfkit'
import { protect, adminOnly } from '../middleware/adminMiddleware.js'
import Order from '../models/Order.js'
import Coupon from '../models/Coupon.js'
import User from '../models/User.js'
import { sendEmail, sendSms } from '../utils/notifications.js'

const router = express.Router()

const buildInvoicePdf = (order) => {
  const doc = new PDFDocument({ margin: 30 })
  doc.fontSize(20).text('Cerestrial Ventures Invoice', { underline: true })
  doc.moveDown()
  doc.fontSize(12).text(`Order ID: ${order._id}`)
  doc.text(`Customer: ${order.customerName}`)
  doc.text(`Phone: ${order.phone}`)
  if (order.email) doc.text(`Email: ${order.email}`)
  doc.text(`Location: ${order.location}`)
  doc.text(`Status: ${order.status}`)
  doc.moveDown()

  doc.fontSize(14).text('Items')
  order.items.forEach((item) => {
    doc.fontSize(12).text(`${item.name} × ${item.quantity} @ KSh ${item.price.toLocaleString()} = KSh ${(item.price * item.quantity).toLocaleString()}`)
  })
  doc.moveDown()

  if (order.coupon && order.coupon.code) {
    doc.text(`Coupon: ${order.coupon.code} (${order.coupon.discountType === 'percent' ? `${order.coupon.value}%` : `KSh ${order.coupon.value}`})`)
  }

  doc.fontSize(14).text(`Total: KSh ${order.totalAmount.toLocaleString()}`, { align: 'right' })
  return doc
}

// GET: Fetch all orders (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 })
    res.json(orders)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET: Fetch orders for logged-in customer (by phone, email, or userId)
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { phone: req.user.phone },
        { email: req.user.email },
        { userId: req.user._id }
      ]
    }).sort({ createdAt: -1 })
    res.json(orders)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST: Create a new order (Checkout)
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      phone,
      email,
      location,
      deliveryTime = 'Today',
      items,
      totalAmount,
      paymentMethod = 'Cash',
      status = 'Order Received',
      mpesaCode = '',
      couponCode
    } = req.body

    if (!customerName || !phone || !location || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must include customer details and at least one item.' })
    }

    const orderData = {
      customerName,
      phone,
      email,
      location,
      deliveryTime,
      items,
      totalAmount,
      paymentMethod,
      status,
      mpesaCode,
    }

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true })
      if (coupon) {
        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
          return res.status(400).json({ message: 'Coupon has expired' })
        }
        if (coupon.usesLeft !== null && coupon.usesLeft <= 0) {
          return res.status(400).json({ message: 'Coupon is no longer valid' })
        }
        orderData.coupon = {
          code: coupon.code,
          discountType: coupon.discountType,
          value: coupon.value,
        }
        if (coupon.usesLeft !== null) {
          coupon.usesLeft -= 1
          await coupon.save()
        }
      }
    }

    const order = new Order(orderData)
    const createdOrder = await order.save()

    const customer = await User.findOne({ $or: [{ phone }, { email }] })
    const preferences = customer?.notificationPreferences || { orderUpdates: true, promotions: true, restock: false }

    const notificationMessage = `Hi ${customerName}, your order ${createdOrder._id} has been received. Total KSh ${createdOrder.totalAmount}. Track status at /track-order.`
    if (preferences.orderUpdates) {
      if (phone) {
        await sendSms({ to: phone, message: notificationMessage })
      }
      if (email) {
        await sendEmail({
          to: email,
          subject: 'Order received - Cerestrial Ventures',
          text: notificationMessage,
          html: `<p>${notificationMessage}</p>`
        })
      }
    }

    res.status(201).json(createdOrder)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET: Invoice PDF for an order
router.get('/:id/invoice', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const invoice = buildInvoicePdf(order)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order._id}.pdf"`)
    invoice.pipe(res)
    invoice.end()
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET: Fetch an individual order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    res.json(order)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PATCH: Update driver location (admin only)
router.patch('/:id/driver-location', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    order.driverLocation = {
      lat: req.body.lat,
      lng: req.body.lng,
    }
    if (req.body.driver) {
      order.driver = {
        name: req.body.driver.name,
        phone: req.body.driver.phone,
        vehicle: req.body.driver.vehicle,
      }
    }

    const updatedOrder = await order.save()
    const io = req.app.get('io')
    if (io) {
      io.to(updatedOrder._id.toString()).emit('driver_location_update', {
        orderId: updatedOrder._id,
        driverLocation: updatedOrder.driverLocation,
        driver: updatedOrder.driver,
      })
    }

    res.json(updatedOrder)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PUT: Update order status to Delivered (admin only)
router.put('/:id/deliver', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    order.status = 'Delivered'
    const updatedOrder = await order.save()

    const io = req.app.get('io')
    if (io) {
      io.to(updatedOrder._id.toString()).emit('order_status_update', {
        orderId: updatedOrder._id,
        status: updatedOrder.status
      })
    }

    res.json(updatedOrder)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PATCH: Update order status by admin
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    order.status = req.body.status
    const updatedOrder = await order.save()

    const io = req.app.get('io')
    if (io) {
      io.to(updatedOrder._id.toString()).emit('order_status_update', {
        orderId: updatedOrder._id,
        status: updatedOrder.status
      })
    }

    const customer = await User.findOne({ $or: [{ phone: updatedOrder.phone }, { email: updatedOrder.email }] })
    const preferences = customer?.notificationPreferences || { orderUpdates: true, promotions: true, restock: false }
    const notificationMessage = `Hi ${updatedOrder.customerName}, your order ${updatedOrder._id} status is now: ${updatedOrder.status}.`
    if (preferences.orderUpdates) {
      if (updatedOrder.phone) {
        await sendSms({ to: updatedOrder.phone, message: notificationMessage })
      }
      if (updatedOrder.email) {
        await sendEmail({
          to: updatedOrder.email,
          subject: 'Order status update - Cerestrial Ventures',
          text: notificationMessage,
          html: `<p>${notificationMessage}</p>`
        })
      }
    }

    res.json(updatedOrder)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router