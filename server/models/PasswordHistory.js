import mongoose from 'mongoose';

const passwordHistorySchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  passwordHash: { type: String, required: true },
  changedAt:    { type: Date, default: Date.now },
});

export default mongoose.model('PasswordHistory', passwordHistorySchema);