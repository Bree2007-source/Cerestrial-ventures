import express from 'express'
import { protect, requireRole } from '../middleware/authMiddleware.js'
import {
  getDeliverySettings,
  updateDeliverySettings,
  getCountdownInfo,
  formatTimeLabel,
  toDateOnlyString,
} from '../utils/deliveryCutoff.js'

const router = express.Router()

function buildPublicPayload(settings) {
  const now = new Date()
  const countdown = getCountdownInfo(settings, now)
  return {
    cutoffTime:  settings.cutoffTime,
    windowStart: settings.windowStart,
    windowEnd:   settings.windowEnd,
    cutoffTimeLabel:  formatTimeLabel(settings.cutoffTime),
    windowStartLabel: formatTimeLabel(settings.windowStart),
    windowEndLabel:   formatTimeLabel(settings.windowEnd),
    todayDate:    toDateOnlyString(now),
    ...countdown, // isPastCutoff, cutoffISO, nowISO, msRemaining
  }
}

// GET /api/delivery-settings/public — no auth, checkout needs this pre-login
router.get('/public', async (req, res) => {
  try {
    const settings = await getDeliverySettings()
    res.json(buildPublicPayload(settings))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/delivery-settings — admin, pre-fills the settings form
router.get('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const settings = await getDeliverySettings()
    res.json(buildPublicPayload(settings))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/delivery-settings — admin, updates + broadcasts live to all clients
router.put('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const { cutoffTime, windowStart, windowEnd } = req.body
    const settings = await updateDeliverySettings({ cutoffTime, windowStart, windowEnd })
    const payload = buildPublicPayload(settings)

    const io = req.app.get('io')
    if (io) io.emit('delivery_settings_updated', payload)

    res.json(payload)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message })
  }
})

export default router