import mongoose from 'mongoose';

const businessSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: String, default: '' },
  description: { type: String, default: '' },
}, { timestamps: true });

const BusinessSetting = mongoose.model('BusinessSetting', businessSettingSchema);
export default BusinessSetting;
