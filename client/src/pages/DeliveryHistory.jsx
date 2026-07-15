import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import DriverBottomNav from '../components/DriverBottomNav';

const DeliveryHistory = () => {
  const [history, setHistory] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`/api/orders/driver/${user._id}/history`);
        setHistory(res.data);
      } catch (err) {
        console.error("Error fetching history:", err);
      }
    };
    if (user?._id) fetchHistory();
  }, [user]);

  return (
    <div className="p-4 pb-24 bg-gray-50 min-h-screen">
      <h2 className="text-xl font-bold mb-4">Delivery History</h2>
      {history.map((order) => (
        <div key={order._id} className="bg-white p-4 mb-3 rounded-lg shadow-sm border">
          <div className="flex justify-between">
            <span className="font-semibold">#{order.receiptNumber}</span>
            <span className={`text-sm font-bold ${order.status === 'Completed' ? 'text-green-600' : 'text-red-600'}`}>
              {order.status}
            </span>
          </div>
          <p className="text-sm text-gray-600">{new Date(order.updatedAt).toLocaleDateString()}</p>
          <p className="font-medium mt-1">Total: KSh {order.totalAmount}</p>
        </div>
      ))}
      <DriverBottomNav />
    </div>
  );
};

export default DeliveryHistory;