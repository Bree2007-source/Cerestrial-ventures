import mongoose from 'mongoose'

// ── DriverAssignment ─────────────────────────────────────────────────────────
// This is an AUDIT LOG, not the source of truth for "who is currently
// assigned to this order" — that's still Order.driver + Driver.currentOrder,
// exactly as orderRoutes.js and driverRoutes.js already implement it. This
// model exists to answer questions the live fields can't, once they're
// overwritten: "who delivered this before it got reassigned?", "how long did
// stop X sit with driver Y before being picked up?", "what's this driver's
// assignment history for the week?"
//
// NOT YET WIRED IN: orderRoutes.js's assign-driver / bulk-assign /
// unassign-driver / complete-delivery / cancel-delivery handlers don't create
// or close these records yet. Wiring it in is a small, additive change to
// each of those handlers (create a record on assignment, set
// unassignedAt + outcome on completion/cancellation/reassignment) — ask if
// you'd like that patch written out for orderRoutes.js.
const driverAssignmentSchema = new mongoose.Schema({
  order:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order',  required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },

  // Who triggered the assignment — an admin user via assign-driver/bulk-assign,
  // or null if it was a system action.
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  assignedAt:   { type: Date, default: Date.now },
  unassignedAt: { type: Date, default: null },

  outcome: {
    type: String,
    enum: ['Delivered', 'Cancelled', 'Reassigned', null],
    default: null,
  },

  // Snapshot fields — kept even if the order/driver later changes, so
  // historical records stay readable without populate() joins.
  customerName: { type: String, default: '' },
  driverName:   { type: String, default: '' },
}, { timestamps: true })

driverAssignmentSchema.index({ driver: 1, assignedAt: -1 })
driverAssignmentSchema.index({ order: 1 })

const DriverAssignment = mongoose.model('DriverAssignment', driverAssignmentSchema)
export default DriverAssignment