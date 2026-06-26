import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import API_BASE_URL, { API_HOST } from "../config";

const socket = io(API_HOST);

const TrackOrder = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const orderId = queryParams.get('id');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const statuses = [
    'Order Received',
    'Payment Confirmed',
    'Processing Order',
    'Packed',
    'Out for Delivery',
    'Delivered'
  ];

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchOrderStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
        if (!response.ok) throw new Error("Order not found");
        const data = await response.json();
        setOrder(data);
      } catch (err) {
        console.error('[TrackOrder] fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderStatus();

    // Join this order's room so the server can push status changes to us instantly.
    socket.emit('join_order', orderId);

    const handleStatusUpdate = ({ orderId: updatedId, status }) => {
      if (updatedId === orderId || updatedId?.toString() === orderId) {
        console.log('[TrackOrder] live status update:', status);
        setOrder(prev => (prev ? { ...prev, status } : prev));
      }
    };
    socket.on('order_status_update', handleStatusUpdate);

    // Slow poll kept only as a fallback in case the socket connection drops.
    const interval = setInterval(fetchOrderStatus, 60000);

    return () => {
      socket.off('order_status_update', handleStatusUpdate);
      clearInterval(interval);
    };
  }, [orderId]);

  if (loading) return <div className="text-center p-6 text-gray-600">Loading order details...</div>;
  if (error) return <div className="text-center text-red-500 p-6">Error: {error}</div>;
  if (!order) return <div className="text-center p-6 text-gray-600">No order reference found.</div>;

  const currentStatusIndex = statuses.indexOf(order.status);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md my-6">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Track Your Order</h2>
      <p className="text-sm text-gray-500 mb-6">
        Order ID: <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{order._id}</span>
      </p>

      {/* Visual Progress Stepper */}
      <div className="relative flex items-center justify-between w-full mb-8 px-2">
        {/* Background Track Line */}
        <div className="absolute left-6 right-6 top-4 h-1 bg-gray-200 z-0">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${(Math.max(0, currentStatusIndex) / (statuses.length - 1)) * 100}%` }}
          ></div>
        </div>

        {/* Step Nodes */}
        {statuses.map((status, index) => (
          <div key={status} className="flex flex-col items-center z-10 relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white transition-colors duration-300 ${
              index <= currentStatusIndex ? "bg-green-500 shadow" : "bg-gray-300"
            }`}>
              {index <= currentStatusIndex ? "✓" : index + 1}
            </div>
            <span className={`text-xs mt-2 font-medium ${
              index <= currentStatusIndex ? "text-green-600 font-semibold" : "text-gray-400"
            }`}>
              {status}
            </span>
          </div>
        ))}
      </div>

      {/* Dynamic Summary Panel */}
      <div className="border-t border-gray-100 pt-4 mt-6 space-y-2">
        <h3 className="font-semibold text-gray-700 mb-2">Delivery Details</h3>
        <p className="text-sm text-gray-600"><span className="font-medium text-gray-800">Items:</span> {order.itemsCount ?? order.items?.length ?? 0} products</p>
        <p className="text-sm text-gray-600"><span className="font-medium text-gray-800">Total Amount:</span> KSh {order.totalAmount}</p>
        <p className="text-sm text-gray-600"><span className="font-medium text-gray-800">Est. Delivery:</span> {order.deliveryTime || "Same-day Delivery"}</p>
      </div>
    </div>
  );
};

export default TrackOrder;