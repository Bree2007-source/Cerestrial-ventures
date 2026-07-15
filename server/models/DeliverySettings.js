import mongoose from 'mongoose'

// Singleton document — there is only ever one delivery-settings record
// (enforced via the fixed `key` below). Keeping this as its own small
// model (rather than folding it into the generic BusinessSetting
// key/value store) keeps reads/writes simple and typed.
const deliverySettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'delivery-settings', unique: true },

  // Stored as 'HH:MM' 24-hour strings, evaluated in the server's local time.
  cutoffTime:  { type: String, default: '06:00' },
  windowStart: { type: String, default: '09:00' },
  windowEnd:   { type: String, default: '14:00' },
}, { timestamps: true })

const DeliverySettings = mongoose.model('DeliverySettings', deliverySettingsSchema)
export default DeliverySettings