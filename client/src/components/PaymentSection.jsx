import React, { useState } from 'react';
import axios from 'axios';

const PaymentSection = ({ order, onComplete }) => {
  const [method, setMethod] = useState('Cash');
  const [cashReceived, setCashReceived] = useState(0);

  const handleComplete = async () => {
    // Validate cash payment
    if (method === 'Cash' && cashReceived < order.totalAmount) {
      alert("Insufficient payment received!");
      return;
    }

    // Update payment info and status
    await axios.patch(`/api/orders/${order._id}/payment`, { 
      paymentStatus: 'Paid',
      paymentMethod: method 
    });
    
    // Complete the delivery
    await axios.patch(`/api/orders/${order._id}/status`, { status: 'Completed' });
    onComplete();
  };

  return (
    <div className="p-4 bg-white rounded shadow-md mt-4">
      <h3 className="font-bold mb-2">Payment</h3>
      <select onChange={(e) => setMethod(e.target.value)} className="w-full p-2 border mb-2">
        <option value="Cash">Cash</option>
        <option value="M-Pesa">M-Pesa</option>
      </select>

      {method === 'Cash' && (
        <div className="mb-4">
          <p>Total: KSh {order.totalAmount}</p>
          <input 
            type="number" 
            placeholder="Amount Received" 
            onChange={(e) => setCashReceived(Number(e.target.value))}
            className="w-full p-2 border mt-1"
          />
          <p className="text-sm mt-1">Change: KSh {Math.max(0, cashReceived - order.totalAmount)}</p>
        </div>
      )}

      <button 
        onClick={handleComplete}
        className="w-full bg-green-600 text-white py-2 rounded"
      >
        Complete Delivery
      </button>
    </div>
  );
};

export default PaymentSection;