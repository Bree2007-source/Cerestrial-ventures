import DeliverySettings from '../models/DeliverySettings.js'

const DEFAULTS = { cutoffTime: '06:00', windowStart: '09:00', windowEnd: '14:00' }
const SETTINGS_KEY = 'delivery-settings'

// ── In-memory cache ─────────────────────────────────────────────────────────
// Every checkout/order-creation call needs the current settings, so we keep
// a cached copy in memory rather than hitting Mongo on every request. The
// cache is refreshed on server start and any time an admin updates the
// settings (see updateDeliverySettings below) — there's no TTL/polling
// needed because this process is the only writer.
let cache = null

function normalizeTime(value, fallback) {
  const raw = String(value ?? '').trim()
  const match = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(raw)
  if (!match) return fallback
  const hour = match[1].padStart(2, '0')
  return `${hour}:${match[2]}`
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

async function loadDeliverySettings() {
  let doc = await DeliverySettings.findOne({ key: SETTINGS_KEY })
  if (!doc) {
    doc = await DeliverySettings.create({ key: SETTINGS_KEY, ...DEFAULTS })
  }
  cache = {
    cutoffTime:  normalizeTime(doc.cutoffTime, DEFAULTS.cutoffTime),
    windowStart: normalizeTime(doc.windowStart, DEFAULTS.windowStart),
    windowEnd:   normalizeTime(doc.windowEnd, DEFAULTS.windowEnd),
  }
  return cache
}

function getCachedSettingsSync() {
  return cache || { ...DEFAULTS }
}

async function getDeliverySettings() {
  if (cache) return cache
  return loadDeliverySettings()
}

async function updateDeliverySettings({ cutoffTime, windowStart, windowEnd }) {
  const next = {
    cutoffTime:  normalizeTime(cutoffTime,  getCachedSettingsSync().cutoffTime),
    windowStart: normalizeTime(windowStart, getCachedSettingsSync().windowStart),
    windowEnd:   normalizeTime(windowEnd,   getCachedSettingsSync().windowEnd),
  }

  if (toMinutes(next.windowEnd) <= toMinutes(next.windowStart)) {
    const err = new Error('Delivery window end time must be after the start time.')
    err.status = 400
    throw err
  }

  await DeliverySettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: next },
    { upsert: true, new: true }
  )

  cache = next
  return cache
}

function toDateOnlyString(date) {
  const year  = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day   = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeLabel(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function cutoffDateFor(referenceDate, cutoffTime) {
  const [hour, minute] = cutoffTime.split(':').map(Number)
  const cutoff = new Date(referenceDate)
  cutoff.setHours(hour, minute, 0, 0)
  return cutoff
}

// Given when an order is placed, returns which calendar day it should be
// delivered on and the metadata that gets stamped onto the Order document.
function getDeliverySchedule(placedAt, settings) {
  const now = placedAt instanceof Date ? new Date(placedAt) : new Date()
  const cutoff = cutoffDateFor(now, settings.cutoffTime)

  const isSameDay = now.getTime() < cutoff.getTime()
  const deliveryDateObj = isSameDay
    ? now
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  return {
    isSameDay,
    deliveryDate: toDateOnlyString(deliveryDateObj),
    deliveryScheduleStatus: isSameDay ? 'TODAY' : 'TOMORROW',
    cutoffTime:  settings.cutoffTime,
    windowStart: settings.windowStart,
    windowEnd:   settings.windowEnd,
  }
}

// Live countdown info for "today's" cutoff, relative to `now`. If `now` is
// already past today's cutoff, msRemaining is 0 — the frontend should show
// "closed, scheduled for tomorrow" in that case rather than a countdown.
function getCountdownInfo(settings, now = new Date()) {
  const cutoff = cutoffDateFor(now, settings.cutoffTime)
  const msRemaining = Math.max(0, cutoff.getTime() - now.getTime())
  return {
    isPastCutoff: now.getTime() >= cutoff.getTime(),
    cutoffISO: cutoff.toISOString(),
    nowISO: now.toISOString(),
    msRemaining,
  }
}

export {
  DEFAULTS as DEFAULT_DELIVERY_SETTINGS,
  getDeliverySettings,
  getCachedSettingsSync,
  updateDeliverySettings,
  loadDeliverySettings,
  getDeliverySchedule,
  getCountdownInfo,
  formatTimeLabel,
  toDateOnlyString,
  normalizeTime,
}