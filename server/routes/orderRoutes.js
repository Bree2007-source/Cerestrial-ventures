import express from 'express'
import jwt from 'jsonwebtoken'
import PDFDocument from 'pdfkit'
import { protect, adminOnly } from '../middleware/adminMiddleware.js'
import Order from '../models/Order.js'
import Coupon from '../models/Coupon.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
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
    doc.fontSize(12).text(
      `${item.name} × ${item.quantity} @ KSh ${item.price.toLocaleString()} = KSh ${(item.price * item.quantity).toLocaleString()}`
    )
  })
  doc.moveDown()
  if (order.coupon?.code) {
    doc.text(`Coupon: ${order.coupon.code} (${order.coupon.discountType === 'percent' ? `${order.coupon.value}%` : `KSh ${order.coupon.value}`})`)
  }
  doc.fontSize(14).text(`Total: KSh ${order.totalAmount.toLocaleString()}`, { align: 'right' })
  return doc
}

const notifyStatusChange = async (updatedOrder, io) => {
  if (io) {
    io.to(updatedOrder._id.toString()).emit('order_status_update', {
      orderId: updatedOrder._id,
      status: updatedOrder.status,
    })
  }
  const customer = await User.findOne({
    $or: [
      { phone: updatedOrder.phone },
      { email: updatedOrder.email },
      { _id: updatedOrder.userId },
    ],
  })
  const preferences = customer?.notificationPreferences || { orderUpdates: true }
  const notificationMessage = `Hi ${updatedOrder.customerName}, your order ${updatedOrder._id} status is now: ${updatedOrder.status}.`
  if (customer) {
    await Notification.create({
      userId: customer._id,
      title: `Order Update: ${updatedOrder.status}`,
      message: `Your order #${updatedOrder._id.toString().slice(-6).toUpperCase()} is now: ${updatedOrder.status}.`,
      type: 'order_status',
      link: '/orders',
    })
  }
  if (preferences.orderUpdates) {
    if (updatedOrder.phone) await sendSms({ to: updatedOrder.phone, message: notificationMessage })
    if (updatedOrder.email) {
      await sendEmail({
        to: updatedOrder.email,
        subject: 'Order status update - Cerestrial Ventures',
        text: notificationMessage,
        html: `<p>${notificationMessage}</p>`,
      })
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /my  ← MUST stay before /:id
// Matches orders by userId, phone, OR email so both authenticated
// and guest/phone-based orders appear in history.
// ─────────────────────────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const { _id, phone, email } = req.user

    // Build $or conditions — only include non-empty values
    const orConditions = [{ userId: _id }]
    if (phone && phone.trim() !== '') orConditions.push({ phone: phone.trim() })
    if (email && email.trim() !== '') orConditions.push({ email: email.toLowerCase().trim() })

    console.log('[GET /my] querying with:', JSON.stringify(orConditions))

    const orders = await Order.find({ $or: orConditions }).sort({ createdAt: -1 })

    console.log(`[GET /my] found ${orders.length} orders`)

    res.json(orders)
  } catch (error) {
    console.error('[GET /my]', error)
    res.status(500).json({ message: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /  — all orders (admin only)
// ─────────────────────────────────────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 })
    res.json(orders)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /  — create order
// Reads userId from JWT token (reliable), body userId is fallback
// ─────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      customerName, phone, email, location,
      latitude, longitude, userId,
      deliveryTime = 'Today', items, totalAmount,
      paymentMethod = 'Cash', status = 'Order Received',
      mpesaCode = '', couponCode,
    } = req.body

    if (!customerName || !phone || !location || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must include customer details and at least one item.' })
    }

    // ✅ Extract userId from token — more reliable than trusting the body
    let resolvedUserId = userId || undefined
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
        if (decoded.id) resolvedUserId = decoded.id
      } catch {}
    }

    const orderData = {
      customerName,
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      location,
      latitude: latitude || null,
      longitude: longitude || null,
      userId: resolvedUserId,
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
        if (coupon.expiresAt && coupon.expiresAt < new Date())
          return res.status(400).json({ message: 'Coupon has expired' })
        if (coupon.usesLeft !== null && coupon.usesLeft <= 0)
          return res.status(400).json({ message: 'Coupon is no longer valid' })
        orderData.coupon = { code: coupon.code, discountType: coupon.discountType, value: coupon.value }
        if (coupon.usesLeft !== null) { coupon.usesLeft -= 1; await coupon.save() }
      }
    }

    const createdOrder = await new Order(orderData).save()

    // Notify customer
    const customer = await User.findOne({
      $or: [
        ...(phone ? [{ phone: phone.trim() }] : []),
        ...(email ? [{ email: email.toLowerCase().trim() }] : []),
        ...(resolvedUserId ? [{ _id: resolvedUserId }] : []),
      ],
    })
    const preferences = customer?.notificationPreferences || { orderUpdates: true }
    const notificationMessage = `Hi ${customerName}, your order ${createdOrder._id} has been received. Total KSh ${createdOrder.totalAmount}. Track status at /track-order.`

    if (customer) {
      await Notification.create({
        userId: customer._id,
        title: 'Order Placed ✅',
        message: `Your order #${createdOrder._id.toString().slice(-6).toUpperCase()} has been received. Total: KSh ${createdOrder.totalAmount.toLocaleString()}.`,
        type: 'order_placed',
        link: '/orders',
      })
    }

    await Notification.create({
      isAdminNotification: true,
      title: 'New Order Received 🛒',
      message: `${customerName} placed an order worth KSh ${createdOrder.totalAmount.toLocaleString()}. Order #${createdOrder._id.toString().slice(-6).toUpperCase()}.`,
      type: 'order_placed',
      link: '/admin',
    })

    if (preferences.orderUpdates) {
      if (phone) await sendSms({ to: phone.trim(), message: notificationMessage })
      if (email) {
        await sendEmail({
          to: email,
          subject: 'Order received - Cerestrial Ventures',
          text: notificationMessage,
          html: `<p>${notificationMessage}</p>`,
        })
      }
    }

    res.status(201).json(createdOrder)
  } catch (error) {
    console.error('[POST /orders]', error)
    res.status(500).json({ message: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/invoice
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// GET /:id  ← must stay after /my and /:id/invoice
// ─────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json({ ...order.toObject(), itemsCount: order.items?.length || 0 })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────
// PATCH /:id/driver-location
// ─────────────────────────────────────────────────────────────────
router.patch('/:id/driver-location', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    order.driverLocation = { lat: req.body.lat, lng: req.body.lng }
    if (req.body.driver) order.driver = req.body.driver
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

// ─────────────────────────────────────────────────────────────────
// PUT /:id/deliver
// ─────────────────────────────────────────────────────────────────
router.put('/:id/deliver', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    order.status = 'Delivered'
    const updatedOrder = await order.save()
    await notifyStatusChange(updatedOrder, req.app.get('io'))
    res.json(updatedOrder)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// ─────────────────────────────────────────────────────────────────
// PATCH /:id/status
// ─────────────────────────────────────────────────────────────────
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    order.status = req.body.status
    const updatedOrder = await order.save()
    await notifyStatusChange(updatedOrder, req.app.get('io'))
    res.json(updatedOrder)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router