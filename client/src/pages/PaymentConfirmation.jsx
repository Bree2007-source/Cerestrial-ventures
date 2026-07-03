import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API_BASE_URL from '../config';
import { useAuth } from '../context/AuthContext';

const PaymentConfirmation = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
  const [transactionCode, setTransactionCode] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [paymentSaved, setPaymentSaved] = useState(false);

  const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token');

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Could not load this order.');
        setOrder(data);
        // If payment was already collected earlier in the workflow, skip
        // straight to the "Complete Delivery" step — no need to re-collect.
        if (data.paymentStatus === 'Paid') {
          setPaymentSaved(true);
        }
        setError('');
      } catch (err) {
        setError(err.message || 'Could not load this order.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const amountDue = useMemo(() => {
    if (!order) return 0;
    return (order.totalAmount || 0) + (order.deliveryFee || 0) - (order.discount || 0);
  }, [order]);

  // Delivery can only be completed once arrival is confirmed AND payment
  // (if required) is settled. Arrival is confirmed on the previous screen —
  // this page is only reachable once order.status === 'Arrived', but we
  // guard again here in case someone lands here directly.
  const arrivalConfirmed = order?.status === 'Arrived'
    || order?.status === 'Delivered'
    || order?.status === 'Completed';
  const canCompleteDelivery = arrivalConfirmed && paymentSaved;

  const fetchActiveOrders = async () => {
    if (!user?._id) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/drivers/${user._id}/orders`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const handleSavePayment = async () => {
    if (!id) return;

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        paymentStatus: 'Paid',
      };

      if (paymentMethod === 'Cash') {
        payload.cashReceived = Number(cashAmount || 0);
      } else {
        payload.mpesaCode = transactionCode.trim();
      }

      const res = await fetch(`${API_BASE_URL}/orders/${id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Could not save payment.');
      }

      setOrder((prev) => prev ? { ...prev, ...data, paymentStatus: 'Paid' } : data);
      setPaymentSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!id || !canCompleteDelivery) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/complete-delivery`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Could not complete this delivery.');
      }

      const remainingOrders = await fetchActiveOrders();
      navigate(remainingOrders.length > 0 ? '/my-deliveries' : '/driver-dashboard');
    } catch (err) {
      setError(err.message || 'Could not complete this delivery.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white min-h-screen">
      <h2 className="text-xl font-bold mb-6">Payment Confirmation</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading order…</div>
      ) : (
        <>
          {!arrivalConfirmed && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              You need to confirm arrival before collecting payment or completing this delivery.
            </div>
          )}

          {paymentSaved ? (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <div className="text-green-700 font-bold">✅ Payment Confirmed</div>
              <div className="text-sm text-gray-500 mt-1">KSH {amountDue.toLocaleString()}</div>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="bg-gray-100 p-2 rounded text-sm font-bold"
                >
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              {paymentMethod === 'M-Pesa' ? (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Transaction Code</span>
                  <input
                    type="text"
                    value={transactionCode}
                    onChange={(e) => setTransactionCode(e.target.value)}
                    className="bg-gray-100 p-2 rounded w-32 text-center font-mono"
                    placeholder="SJH44GH7JK"
                  />
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Cash Amount</span>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="bg-gray-100 p-2 rounded w-32 text-center"
                    placeholder="0"
                  />
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold">KSH {amountDue.toLocaleString()}</span>
              </div>
            </div>
          )}

          {!paymentSaved && (
            <button
              onClick={handleSavePayment}
              disabled={submitting || !arrivalConfirmed}
              className="w-full bg-green-700 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save Payment'}
            </button>
          )}

          <button
            onClick={handleCompleteDelivery}
            disabled={submitting || !canCompleteDelivery}
            className="w-full mt-3 bg-green-700 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-60"
          >
            {submitting ? 'Completing…' : 'Complete Delivery'}
          </button>

          {!canCompleteDelivery && arrivalConfirmed && (
            <div className="text-xs text-gray-400 text-center mt-2">
              Payment must be confirmed before you can complete this delivery.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PaymentConfirmation;