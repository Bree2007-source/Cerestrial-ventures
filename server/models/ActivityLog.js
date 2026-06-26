/**
 * server/models/ActivityLog.js
 *
 * Tracks admin actions (status changes, product edits, etc.)
 * This is already imported in your existing adminRoutes.js —
 * replace this file if one already exists, or create it if not.
 */

import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      default: null,
    },
    action: {
      type:     String,
      required: true,
      trim:     true,
    },
    meta: {
      type:    mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Keep only the most recent 1 000 logs to avoid unbounded growth.
// Run this index once; MongoDB will handle TTL automatically.
activityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;