const Notification = require('../models/Notification');

// This function saves a notification to the database and sends a live socket message
const triggerNotification = async (io, { userId, role, title, message, type, metadata }) => {
  try {
    const notification = await Notification.create({
      userId,
      role,
      title,
      message,
      type,
      read: false,
      metadata
    });

    if (io) {
      if (userId) {
        io.to(userId.toString()).emit('notification', notification);
      }
      if (role) {
        io.to(role).emit('notification', notification);
      }
    }

    return notification;
  } catch (error) {
    console.error('Error triggering notification:', error);
  }
};

const notifyOrderStatus = async (io, order, statusMessage, title = 'Order Update') => {
  return triggerNotification(io, {
    userId: order.customerId,
    title,
    message: statusMessage,
    type: 'ORDER_UPDATE',
    metadata: { orderId: order._id }
  });
};

const notifyLowStock = async (io, item) => {
  return triggerNotification(io, {
    role: 'admin',
    title: 'Low Stock Alert',
    message: `Item ${item.name} is running low on stock (${item.quantity} remaining).`,
    type: 'LOW_STOCK',
    metadata: { itemId: item._id }
  });
};

module.exports = {
  triggerNotification,
  notifyOrderStatus,
  notifyLowStock
};