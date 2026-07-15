import Notification from '../models/Notification.js'

const TYPE_ICONS = {
  order_placed: '🛒',
  order_status: '📦',
  low_stock:    '⚠️',
  new_customer: '👤',
  payment:      '💳',
  driver_alert: '🚗',
  general:      '🔔',
}

export async function createAndEmit(io, {
  title,
  message,
  type = 'general',
  link = '',
  userId = null,
  driverId = null,
  isAdminNotification = false,
  socketRooms = [],
}) {
  try {
    const doc = await Notification.create({
      title, message, type, link,
      userId:              userId   || null,
      driverId:            driverId || null,
      isAdminNotification,
      read: false,
    })

    if (io && socketRooms.length > 0) {
      const payload = {
        _id:                 doc._id,
        title:               doc.title,
        message:             doc.message,
        type:                doc.type,
        link:                doc.link,
        read:                false,
        createdAt:           doc.createdAt,
        isAdminNotification: doc.isAdminNotification,
        icon:                TYPE_ICONS[doc.type] || '🔔',
      }
      socketRooms.forEach(room => io.to(room).emit('new_notification', payload))
    }

    return doc
  } catch (err) {
    console.error('[notifyHelpers] createAndEmit failed:', err.message)
    return null
  }
}

export const notifyCustomer = (io, { userId, orderId, ...rest }) =>
  createAndEmit(io, {
    ...rest,
    userId,
    isAdminNotification: false,
    socketRooms: orderId ? [orderId.toString()] : [],
  })

export const notifyAdmin = (io, opts) =>
  createAndEmit(io, {
    ...opts,
    isAdminNotification: true,
    socketRooms: ['admin_room'],
  })

export const notifyDriver = (io, { driverId, ...rest }) =>
  createAndEmit(io, {
    ...rest,
    driverId,
    isAdminNotification: false,
    socketRooms: [`driver_${driverId}`],
  })