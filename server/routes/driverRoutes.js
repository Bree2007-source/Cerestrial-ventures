import express from 'express'
import Driver from '../models/Driver.js'
import Order from '../models/Order.js'
import Notification from '../models/Notification.js'
import { protect, requireRole, requireOwnDriverRecord } from '../middleware/authMiddleware.js'
import { recomputeDriverRoute } from './orderRoutes.js'

const router = express.Router()

// Same active-status set orderRoutes.js uses when building activeOrders
// for the optimizer — kept in sync intentionally, not redefined.
const ACTIVE_ORDER_STATUSES = ['Assigned to Driver', 'Driver On The Way', 'Driver Arrived']
// Minimum movement (km) before a GPS ping is considered "significant"
// enough to justify a fresh OSRM route recompute. Below this, the raw
// location is still saved (so live tracking on the admin map stays
// accurate), but routeDistanceKm/routeSequence aren't recalculated —
// avoids hammering OSRM on every watchPosition tick, which can fire
// every few seconds even while the driver is standing still.
const SIGNIFICANT_MOVE_KM = 0.15 // ~150m

// Haversine distance in km between two lat/lng points.
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── GET /api/drivers ─────────────────────────────────────────────────────────
// Admin-only — powers AdminDrivers.jsx's table + stat cards.
// Excludes password. currentOrder is populated so the "Current Delivery"
// column can show something readable instead of just an ObjectId.
router.get('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const drivers = await Driver.find({})
      .select('-password')
      .populate('currentOrder', 'customerName totalAmount status')
      .sort({ createdAt: -1 })
    res.json(drivers)
  } catch (err) {
    console.error('[driverRoutes] GET / error', err)
    res.status(500).json({ message: 'Could not load drivers.' })
  }
})

// ── POST /api/drivers ────────────────────────────────────────────────────────
// Admin-only — creates a driver account. Password hashing happens in the
// Driver model's pre('save') hook (bcryptjs, 12 rounds — same as User.js),
// so nothing here does hashing manually. Defaults to "driver123" if the
// admin leaves the password field blank when adding a new driver.
router.post('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const { name, phone, email, vehicleType, vehicleRegistration, password } = req.body

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required.' })
    }

    const existing = await Driver.findOne({ $or: [{ phone }, { email }] })
    if (existing) {
      return res.status(400).json({ message: 'A driver with this phone or email already exists.' })
    }

    const driver = await Driver.create({
      name,
      phone,
      email,
      vehicleType,
      vehicleRegistration,
      password: password && password.trim() ? password : 'driver123',
    })

    const driverSafe = driver.toObject()
    delete driverSafe.password

    res.status(201).json(driverSafe)
  } catch (err) {
    console.error('[driverRoutes] POST / error', err)
    res.status(500).json({ message: err.message || 'Could not create driver.' })
  }
})

// ── PUT /api/drivers/:id ─────────────────────────────────────────────────────
// Admin-only — edits a driver's details. Password only changes if the
// admin actually typed a new one (AdminDrivers.jsx strips the field from
// the payload entirely when left blank on edit, but we guard here too).
router.put('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const { name, phone, email, vehicleType, vehicleRegistration, password } = req.body

    const driver = await Driver.findById(req.params.id)
    if (!driver) return res.status(404).json({ message: 'Driver not found' })

    if (name !== undefined) driver.name = name
    if (phone !== undefined) driver.phone = phone
    if (email !== undefined) driver.email = email
    if (vehicleType !== undefined) driver.vehicleType = vehicleType
    if (vehicleRegistration !== undefined) driver.vehicleRegistration = vehicleRegistration
    if (password && password.trim()) driver.password = password // triggers pre('save') hash

    await driver.save()

    const driverSafe = driver.toObject()
    delete driverSafe.password

    res.json(driverSafe)
  } catch (err) {
    console.error('[driverRoutes] PUT /:id error', err)
    res.status(500).json({ message: err.message || 'Could not update driver.' })
  }
})

// ── DELETE /api/drivers/:id ──────────────────────────────────────────────────
// Admin-only. Refuses to delete a driver with active deliveries so
// in-flight orders never end up pointing at a deleted driver.
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const activeCount = await Order.countDocuments({
      driver: req.params.id,
      status: { $in: ACTIVE_ORDER_STATUSES },
    })

    if (activeCount > 0) {
      return res.status(400).json({
        message: `Cannot delete — this driver has ${activeCount} active deliver${activeCount === 1 ? 'y' : 'ies'}. Reassign or complete them first.`,
      })
    }

    const driver = await Driver.findByIdAndDelete(req.params.id)
    if (!driver) return res.status(404).json({ message: 'Driver not found' })

    res.json({ message: 'Driver deleted' })
  } catch (err) {
    console.error('[driverRoutes] DELETE /:id error', err)
    res.status(500).json({ message: 'Could not delete driver.' })
  }
})

// ── PATCH /api/drivers/:id/toggle-active ─────────────────────────────────────
// Admin-only — flips isActive. Deactivating a driver does NOT touch their
// current assignments; it just prevents new orders being assigned to them
// (bulk-assign and single assign-driver both check isActive already).
router.patch('/:id/toggle-active', protect, requireRole('admin'), async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
    if (!driver) return res.status(404).json({ message: 'Driver not found' })

    driver.isActive = !driver.isActive
    await driver.save()

    const driverSafe = driver.toObject()
    delete driverSafe.password

    res.json(driverSafe)
  } catch (err) {
    console.error('[driverRoutes] PATCH /:id/toggle-active error', err)
    res.status(500).json({ message: 'Could not update driver status.' })
  }
})

// ── GET /api/drivers/:driverId/orders ───────────────────────────────────────
// Returns a RAW ARRAY — DriverDashboard.jsx does
// `ordersRes.ok ? await ordersRes.json() : []` and maps over it directly.
// Admins can also view a driver's active queue (e.g. for an admin
// "driver detail" screen); a driver can only view their own.
//
// Every call recomputes the route (routeDistanceKm/routeDurationMin/
// routeSequence) before returning — this is what makes "refresh My
// Deliveries" one of the required recompute triggers. Always runs
// regardless of GPS movement, since the driver explicitly asked for
// up-to-date numbers by opening/refreshing the screen.
router.get('/:driverId/orders', protect, requireRole('driver', 'admin'), requireOwnDriverRecord, async (req, res) => {
  try {
    await recomputeDriverRoute(req.params.driverId)

    const orders = await Order.find({
      driver: req.params.driverId,
      status: { $in: ACTIVE_ORDER_STATUSES },
    }).sort('routeSequence')

    res.json(orders)
  } catch (err) {
    console.error('[driverRoutes] GET /:driverId/orders error', err)
    res.status(500).json({ success: false, message: 'Could not load orders.' })
  }
})

// ── PATCH /api/drivers/:driverId/location ───────────────────────────────────
// Hit on every navigator.geolocation.watchPosition tick from the
// dashboard (fire-and-forget on the client, response body isn't read).
// The raw location is always saved (live tracking needs it), but the
// route is only recomputed if the driver has moved more than
// SIGNIFICANT_MOVE_KM since the last saved fix — this is what "GPS
// location changes significantly" means for trigger #4. Without this
// gate, a route recompute (and an OSRM call) would fire on every single
// GPS tick, which is wasteful and can rate-limit the OSRM endpoint.
router.patch('/:driverId/location', protect, requireRole('driver'), requireOwnDriverRecord, async (req, res) => {
  try {
    const { lat, lng, address } = req.body
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ success: false, message: 'lat and lng (numbers) are required.' })
    }

    const driverBefore = await Driver.findById(req.params.driverId).select('currentLocation')
    const prevLoc = driverBefore?.currentLocation

    const hasMovedSignificantly =
      !prevLoc?.lat || !prevLoc?.lng ||
      distanceKm(prevLoc.lat, prevLoc.lng, lat, lng) >= SIGNIFICANT_MOVE_KM

    await Driver.findByIdAndUpdate(req.params.driverId, {
      currentLocation: { lat, lng, address: address || '', updatedAt: new Date() },
    })

    let newSequence = null
    if (hasMovedSignificantly) {
      newSequence = await recomputeDriverRoute(req.params.driverId)
    }

    const io = req.app.get('io')
    if (io && newSequence) {
      io.to(`driver_${req.params.driverId}`).emit('route_updated', { sequence: newSequence })
    }

    // Also let the admin dashboard's live-map widget subscribe to this
    // driver's movement without polling. This always fires, independent
    // of the route-recompute gate above — live tracking shouldn't lag.
    if (io) {
      io.to('admin_room').emit('driver_location_updated', {
        driverId: req.params.driverId,
        lat, lng,
        updatedAt: new Date(),
      })
    }

    res.json({ success: true, routeRecomputed: hasMovedSignificantly })
  } catch (err) {
    console.error('[driverRoutes] PATCH /:driverId/location error', err)
    res.status(500).json({ success: false, message: 'Could not update location.' })
  }
})

// ── GET /api/drivers/:driverId/notifications ────────────────────────────────
// NEW — powers Notifications.jsx. Driver can only view their own; admin can
// view any driver's feed. Requires Notification documents to carry a
// `driverId` field — see the Notification.js model note shipped alongside
// this file, which adds that field without touching the existing
// userId/isAdminNotification behavior used by the customer + admin apps.
router.get('/:driverId/notifications', protect, requireRole('driver', 'admin'), requireOwnDriverRecord, async (req, res) => {
  try {
    const notifications = await Notification.find({ driverId: req.params.driverId })
      .sort({ createdAt: -1 })
      .limit(100)
    res.json(notifications)
  } catch (err) {
    console.error('[driverRoutes] GET /:driverId/notifications error', err)
    res.status(500).json({ message: 'Could not load notifications.' })
  }
})

// ── PATCH /api/drivers/:driverId/notifications/:notifId/read ───────────────
// NEW — marks a single notification read. Scoped to driverId so a driver
// can't mark another driver's notification as read even with a guessed id.
router.patch('/:driverId/notifications/:notifId/read', protect, requireRole('driver', 'admin'), requireOwnDriverRecord, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notifId, driverId: req.params.driverId },
      { read: true },
      { new: true }
    )
    if (!notification) return res.status(404).json({ message: 'Notification not found' })
    res.json(notification)
  } catch (err) {
    console.error('[driverRoutes] PATCH notifications/:notifId/read error', err)
    res.status(500).json({ message: 'Could not update notification.' })
  }
})

export default router