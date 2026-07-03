import express from 'express'
import Order from '../models/Order.js'
import Driver from '../models/Driver.js'
import { protect, requireRole, requireOwnDriverRecord } from '../middleware/authMiddleware.js'
import { optimizeRoute } from '../utils/routeOptimizer.js'

const router = express.Router()

// ── Recompute + persist route sequence for all of a driver's active stops ──
// Called any time the active-order set for a driver changes (new
// assignment, or one stop completing/cancelling).
async function recomputeDriverRoute(driverId) {
  const driver = await Driver.findById(driverId)
  if (!driver) return

  const activeOrders = await Order.find({
    driver: driverId,
    status: { $in: ['Assigned to Driver', 'Driver On The Way', 'Arrived'] },
  })

  if (activeOrders.length === 0) return

  // FIX: use currentLocation.updatedAt (bumps only on a real GPS ping),
  // not driver.updatedAt (bumps on ANY field change — status, currentOrder,
  // completedDeliveries, etc). The old version made the staleness check in
  // optimizeRoute() unreliable, which is why distances were showing as 0.0 km
  // even when currentLocation actually had fresh coordinates.
  const driverLocation = driver.currentLocation?.lat && driver.currentLocation?.lng
    ? { lat: driver.currentLocation.lat, lng: driver.currentLocation.lng, updatedAt: driver.currentLocation.updatedAt }
    : null

  const sequence = await optimizeRoute(driverLocation, activeOrders)

  // Route order is a recommendation only — drivers frequently pass stops
  // physically before reaching the "next" one in optimized order.
  // routeSequence/distance/duration are persisted purely for display and
  // sorting (e.g. "Sort by Distance"); they never gate which stop a driver
  // is allowed to start.
  await Promise.all(sequence.map(s =>
    Order.findByIdAndUpdate(s.orderId, {
      routeSequence:    s.sequence,
      routeDistanceKm:  s.distanceKm,
      routeDurationMin: s.durationMin,
      routeIsEstimate:  s.isEstimate,
    })
  ))

  return sequence
}

router.get('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('driver', 'name phone vehicleType')
    res.json(orders)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/my', protect, async (req, res) => {
  try {
    const user = req.user
    const query = {
      $or: [
        { userId: user._id },
        { phone:  user.phone  || '__none__' },
        { email:  user.email  || '__none__' },
      ],
    }
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('driver', 'name phone vehicleType')
    res.json(orders)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/user/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('driver', 'name phone')
    res.json(orders)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/phone/:phone', async (req, res) => {
  try {
    const orders = await Order.find({ phone: req.params.phone })
      .sort({ createdAt: -1 })
      .populate('driver', 'name phone')
    res.json(orders)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('driver', 'name phone vehicleType currentLocation')
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const {
      customerName, phone, location, coordinates,
      items, totalAmount, deliveryFee, userId,
      paymentMethod, mpesaCode, deliveryTime,
    } = req.body

    const order = await Order.create({
      customerName,
      phone,
      location,
      coordinates,
      items,
      totalAmount,
      deliveryFee:   deliveryFee   || 0,
      userId:        userId        || null,
      paymentMethod: paymentMethod || 'M-Pesa',
      mpesaCode:     mpesaCode     || '',
      deliveryTime:  deliveryTime  || 'Today',
      status:        'Pending',
    })

    const io = req.app.get('io')
    if (io) {
      io.to('admin_room').emit('order_updated', {
        orderId: order._id.toString(),
        status:  order.status,
        isNew:   true,
      })
    }

    res.status(201).json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH /api/orders/:id/status — admin-only (manual status overrides)
router.patch('/:id/status', protect, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body
    const order = await Order.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    ).populate('driver', 'name phone')

    if (!order) return res.status(404).json({ message: 'Order not found' })

    const io = req.app.get('io')
    let driverIdForRouteRecompute = null

    if (status === 'Delivered' && order.driver) {
      await Driver.findByIdAndUpdate(order.driver, {
        $inc: { completedDeliveries: 1 },
        status:       'Available',
        currentOrder: null,
      })
      order.receiptGenerated = true
      order.paymentStatus    = 'Paid'
      order.routeSequence    = null
      await order.save()
      driverIdForRouteRecompute = order.driver._id
    }

    if (status === 'Cancelled' && order.driver) {
      driverIdForRouteRecompute = order.driver._id
      order.routeSequence  = null
      await order.save()
    }

    // Recompute the remaining route for that driver's other stops, if any
    if (driverIdForRouteRecompute) {
      const newSequence = await recomputeDriverRoute(driverIdForRouteRecompute)
      if (io && newSequence) {
        newSequence.forEach(s => {
          io.to(s.orderId.toString()).emit('order_status_changed', {
            orderId: s.orderId.toString(),
            status: 'Assigned to Driver',
          })
        })
        io.to(`driver_${driverIdForRouteRecompute}`).emit('route_updated', { sequence: newSequence })
      }
    }

    if (io) {
      io.to(order._id.toString()).emit('order_status_changed', {
        orderId:    order._id.toString(),
        status:     order.status,
        driverName: order.driver?.name || order.driverName || '',
      })
      io.to('admin_room').emit('order_updated', {
        orderId: order._id.toString(),
        status:  order.status,
      })
      if (status === 'Delivered' && order.driver) {
        io.to('admin_room').emit('driver_status_changed', {
          driverId:     order.driver._id.toString(),
          status:       'Available',
          currentOrder: null,
        })
      }
    }

    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH /api/orders/bulk-assign — admin-only; assigns many orders to one
// driver in a single action. Unlike /:id/assign-driver, this does NOT
// require the driver to be 'Available' — it also accepts 'On Delivery' so
// an admin can extend a driver's existing queue with more stops. Only
// 'Offline' drivers are rejected.
router.patch('/bulk-assign', protect, requireRole('admin'), async (req, res) => {
  try {
    const { orderIds, driverId } = req.body

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: 'orderIds must be a non-empty array' })
    }

    const driver = await Driver.findById(driverId)
    if (!driver) return res.status(404).json({ message: 'Driver not found' })
    if (!driver.isActive) return res.status(400).json({ message: 'Driver is not active' })
    if (driver.status === 'Offline') return res.status(400).json({ message: 'Driver is offline' })

    // Only touch orders still assignable — skip anything already
    // delivered/cancelled so a stale selection can't corrupt finished orders.
    const orders = await Order.find({
      _id: { $in: orderIds },
      status: { $nin: ['Delivered', 'Cancelled'] },
    })

    const foundIds = new Set(orders.map(o => o._id.toString()))
    const skipped = orderIds.filter(id => !foundIds.has(id))

    if (orders.length === 0) {
      return res.status(400).json({ message: 'None of the selected orders could be assigned.', skipped })
    }

    await Order.updateMany(
      { _id: { $in: orders.map(o => o._id) } },
      { driver: driverId, driverName: driver.name, status: 'Assigned to Driver' }
    )

    await Driver.findByIdAndUpdate(driverId, { status: 'On Delivery' })

    // Recompute the driver's route ONCE now that all new stops exist —
    // not once per order, which would mean N sequential optimizer calls.
    const newSequence = await recomputeDriverRoute(driverId)

    if (newSequence && newSequence.length > 0) {
      await Driver.findByIdAndUpdate(driverId, { currentOrder: newSequence[0].orderId })
    }

    const io = req.app.get('io')
    if (io) {
      orders.forEach(o => {
        io.to(o._id.toString()).emit('order_status_changed', {
          orderId: o._id.toString(),
          status: 'Assigned to Driver',
          driverName: driver.name,
        })
        io.to('admin_room').emit('order_updated', {
          orderId: o._id.toString(),
          status: 'Assigned to Driver',
        })
      })
      io.to(`driver_${driverId}`).emit('orders_bulk_assigned', {
        orderIds: orders.map(o => o._id.toString()),
      })
      if (newSequence) {
        io.to(`driver_${driverId}`).emit('route_updated', { sequence: newSequence })
      }
      io.to('admin_room').emit('driver_status_changed', {
        driverId: driverId.toString(),
        status: 'On Delivery',
        currentOrder: newSequence?.[0]?.orderId?.toString() || null,
      })
    }

    res.json({
      assignedCount: orders.length,
      skipped,
      driver: { _id: driver._id, name: driver.name },
      sequence: newSequence,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH /api/orders/:id/assign-driver — admin-only
router.patch('/:id/assign-driver', protect, requireRole('admin'), async (req, res) => {
  try {
    const { driverId } = req.body
    const driver = await Driver.findById(driverId)
    if (!driver)              return res.status(404).json({ message: 'Driver not found' })
    if (!driver.isActive)     return res.status(400).json({ message: 'Driver is not active' })
    if (driver.status !== 'Available') return res.status(400).json({ message: 'Driver is not available' })

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { driver: driverId, driverName: driver.name, status: 'Assigned to Driver' },
      { new: true }
    ).populate('driver', 'name phone vehicleType')

    if (!order) return res.status(404).json({ message: 'Order not found' })

    await Driver.findByIdAndUpdate(driverId, {
      status:       'On Delivery',
      currentOrder: order._id,
    })

    // Recompute this driver's whole route now that they have a new stop
    const newSequence = await recomputeDriverRoute(driverId)

    const io = req.app.get('io')
    if (io) {
      io.to(order._id.toString()).emit('order_status_changed', {
        orderId:    order._id.toString(),
        status:     order.status,
        driverName: driver.name,
      })
      io.to(`driver_${driverId}`).emit('order_assigned', { order })
      if (newSequence) {
        io.to(`driver_${driverId}`).emit('route_updated', { sequence: newSequence })
      }
      io.to('admin_room').emit('order_updated', {
        orderId: order._id.toString(),
        status:  order.status,
      })
      io.to('admin_room').emit('driver_status_changed', {
        driverId:     driverId.toString(),
        status:       'On Delivery',
        currentOrder: order._id.toString(),
      })
    }

    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH /api/orders/:id/start-delivery — driver-only; must be the assigned
// driver. Any assigned stop may be started, regardless of route position —
// route order is a recommendation, not a restriction.
router.patch('/:id/start-delivery', protect, requireRole('driver'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('driver', 'name phone')
    if (!order) return res.status(404).json({ message: 'Order not found' })

    if (!order.driver || order.driver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This delivery is not assigned to you.' })
    }

    order.status = 'Driver On The Way'
    await order.save()

    const io = req.app.get('io')
    if (io) {
      io.to(order._id.toString()).emit('order_status_changed', {
        orderId:    order._id.toString(),
        status:     order.status,
        driverName: order.driver?.name || order.driverName || '',
      })
      io.to('admin_room').emit('order_updated', {
        orderId: order._id.toString(),
        status:  order.status,
      })
    }

    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH /api/orders/:id/mark-arrived — driver-only; must be the assigned
// driver, and the order must currently be en route ('Driver On The Way').
// Mirrors the ownership/security pattern used by /start-delivery.
router.patch('/:id/mark-arrived', protect, requireRole('driver'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('driver', 'name phone')
    if (!order) return res.status(404).json({ message: 'Order not found' })

    if (!order.driver || order.driver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This delivery is not assigned to you.' })
    }

    if (order.status !== 'Driver On The Way') {
      return res.status(400).json({
        message: 'This delivery must be en route before it can be marked as arrived.',
      })
    }

    order.status = 'Arrived'
    // NOTE: only persists if `arrivedAt` is declared in the Order schema —
    // Mongoose's default strict mode silently drops undeclared fields.
    order.arrivedAt = new Date()
    await order.save()

    const io = req.app.get('io')
    if (io) {
      io.to(order._id.toString()).emit('order_status_changed', {
        orderId:    order._id.toString(),
        status:     order.status,
        driverName: order.driver?.name || order.driverName || '',
      })
      io.to('admin_room').emit('order_updated', {
        orderId: order._id.toString(),
        status:  order.status,
      })
    }

    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH /api/orders/:id/payment — record M-Pesa code or cash payment status
router.patch('/:id/payment', protect, requireRole('driver', 'admin'), async (req, res) => {
  try {
    const { mpesaCode, paymentStatus } = req.body
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { mpesaCode, paymentStatus },
      { new: true }
    )

    const io = req.app.get('io')
    if (io && order) {
      io.to(order._id.toString()).emit('payment_status_changed', {
        orderId: order._id.toString(),
        paymentStatus: order.paymentStatus,
      })
    }

    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH /api/orders/:id/cancel-delivery — driver-only; must be the assigned driver
router.patch('/:id/cancel-delivery', protect, requireRole('driver'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('driver', 'name phone')
    if (!order) return res.status(404).json({ message: 'Order not found' })

    if (!order.driver || order.driver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This delivery is not assigned to you.' })
    }

    if (['Delivered', 'Completed', 'Cancelled'].includes(order.status)) {
      return res.status(400).json({ message: 'This delivery can no longer be cancelled.' })
    }

    const driverId = order.driver._id
    order.status         = 'Cancelled'
    order.routeSequence  = null
    await order.save()

    await Driver.findByIdAndUpdate(driverId, {
      status:       'Available',
      currentOrder: null,
    })

    const newSequence = await recomputeDriverRoute(driverId)

    const io = req.app.get('io')
    if (io) {
      io.to(order._id.toString()).emit('order_status_changed', {
        orderId: order._id.toString(),
        status:  order.status,
      })
      io.to('admin_room').emit('order_updated', {
        orderId: order._id.toString(),
        status:  order.status,
      })
      io.to('admin_room').emit('driver_status_changed', {
        driverId:     driverId.toString(),
        status:       'Available',
        currentOrder: null,
      })
      if (newSequence) {
        io.to(`driver_${driverId}`).emit('route_updated', { sequence: newSequence })
      }
    }

    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PATCH /api/orders/:id/complete-delivery — driver-only; requires payment already confirmed
router.patch('/:id/complete-delivery', protect, requireRole('driver'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('driver', 'name phone')
    if (!order) return res.status(404).json({ message: 'Order not found' })

    if (!order.driver || order.driver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This delivery is not assigned to you.' })
    }

    if (order.paymentStatus !== 'Paid') {
      return res.status(400).json({ message: 'Payment must be confirmed before completing this delivery.' })
    }

    const driverId = order.driver._id
    order.status            = 'Delivered'
    order.receiptGenerated  = true
    order.routeSequence     = null
    await order.save()

    await Driver.findByIdAndUpdate(driverId, {
      $inc: { completedDeliveries: 1, earnings: order.deliveryFee || 0 },
      status:       'Available',
      currentOrder: null,
    })

    const newSequence = await recomputeDriverRoute(driverId)

    const io = req.app.get('io')
    if (io) {
      io.to(order._id.toString()).emit('order_status_changed', {
        orderId:    order._id.toString(),
        status:     order.status,
        driverName: order.driver?.name || order.driverName || '',
      })
      io.to('admin_room').emit('order_updated', {
        orderId: order._id.toString(),
        status:  order.status,
      })
      io.to('admin_room').emit('driver_status_changed', {
        driverId:     driverId.toString(),
        status:       'Available',
        currentOrder: null,
      })
      if (newSequence) {
        io.to(`driver_${driverId}`).emit('route_updated', { sequence: newSequence })
      }
    }

    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id)
    res.json({ message: 'Order deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/orders/driver/:driverId/history — driver can view own history, admin can view any
router.get('/driver/:driverId/history', protect, requireRole('driver', 'admin'), requireOwnDriverRecord, async (req, res) => {
  try {
    const history = await Order.find({
      driver: req.params.driverId,
      status: { $in: ['Completed', 'Cancelled', 'Failed', 'Delivered'] }
    }).sort({ updatedAt: -1 });

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export { recomputeDriverRoute }
export default router