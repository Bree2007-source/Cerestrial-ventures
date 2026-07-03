import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import useSocket from '../hooks/useSocket';

const FONT_FAMILY = "'Poppins', 'Segoe UI', sans-serif";
const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token');

const PaymentFlow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useSocket({ joinOrder: id });

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('mpesa'); // 'mpesa' | 'cash'
  const [phone, setPhone] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [stkStatus, setStkStatus] = useState('idle'); // idle | sending | waiting | success | failed
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);
  const pollRef = useRef(null);

  const amountDue = order
    ? (order.totalAmount || 0) + (order.deliveryFee || 0) - (order.discount || 0)
    : 0;

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data);
      setPhone(data.phone || '');
      if (data.paymentStatus === 'Paid') setStkStatus('success');
    } catch {
      setError('Could not load this order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Live payment confirmation via the order's socket room — fires the
  // instant the M-Pesa callback lands server-side, no polling needed
  // when sockets are connected. Polling below is a fallback only.
  useEffect(() => {
    if (!socket) return;
    const onPaymentChanged = (payload) => {
      if (payload.paymentStatus === 'Paid') {
        setStkStatus('success');
        clearPolling();
      } else if (payload.paymentStatus === 'Failed') {
        setStkStatus('failed');
        setError('Payment was not completed on the customer\'s phone.');
        clearPolling();
      }
    };
    socket.on('payment_status_changed', onPaymentChanged);
    return () => socket.off('payment_status_changed', onPaymentChanged);
  }, [socket]);

  const clearPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => () => clearPolling(), []);

  const startPolling = () => {
    clearPolling();
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${id}`);
        const data = await res.json();
        if (data.paymentStatus === 'Paid') {
          setStkStatus('success');
          clearPolling();
        }
      } catch {
        // keep trying
      }
      if (attempts >= 20) { // ~1 minute at 3s intervals
        clearPolling();
        setStkStatus((s) => (s === 'success' ? s : 'failed'));
        setError((e) => (e || 'No confirmation received yet. Ask the customer to check their phone, or try again.'));
      }
    }, 3000);
  };

  const handleSendStk = async () => {
    setError('');
    setStkStatus('sending');
    try {
      const res = await fetch(`${API_BASE_URL}/mpesa/stk/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ phone, amount: amountDue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStkStatus('failed');
        setError(data.message || 'Could not send the payment request.');
        return;
      }
      setStkStatus('waiting');
      startPolling();
    } catch {
      setStkStatus('failed');
      setError('Network error — please try again.');
    }
  };

  const handleConfirmCash = async () => {
    setError('');
    const received = Number(cashReceived);
    if (!received || received < amountDue) {
      setError(`Cash received must be at least KSh ${amountDue.toLocaleString()}.`);
      return;
    }
    setFinishing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ paymentStatus: 'Paid', cashReceived: received }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Could not record this payment.');
        return;
      }
      setStkStatus('success');
    } catch {
      setError('Network error — please try again.');
    } finally {
      setFinishing(false);
    }
  };

  const handleCompleteDelivery = async () => {
    setFinishing(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/complete-delivery`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Could not complete this delivery.');
        return;
      }
      navigate('/driver-dashboard');
    } catch {
      setError('Network error — please try again.');
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: FONT_FAMILY }}>
        Loading…
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontFamily: FONT_FAMILY }}>
        {error || 'Order not found.'}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', paddingBottom: 40, fontFamily: FONT_FAMILY }}>

      <div style={{
        background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
        padding: '18px 18px 26px', color: '#fff',
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: 0.9, marginBottom: 10 }}>
          ← Back
        </button>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Collect Payment</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{order.customerName}</div>
      </div>

      <div style={{ padding: '0 16px', marginTop: -16 }}>

        <div style={{ background: '#fff', borderRadius: 16, padding: 18, marginTop: 14, textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5 }}>AMOUNT DUE</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#15803d', marginTop: 4 }}>KSh {amountDue.toLocaleString()}</div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, padding: '10px 12px', borderRadius: 12, marginTop: 14 }}>
            {error}
          </div>
        )}

        {stkStatus === 'success' ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 26, marginTop: 14, textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>Payment received</div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', marginBottom: 18 }}>Mark this delivery as complete to finish up.</div>
            <button
              onClick={handleCompleteDelivery}
              disabled={finishing}
              style={{
                width: '100%', background: '#15803d', color: '#fff', border: 'none',
                borderRadius: 12, padding: '13px', fontWeight: 800, fontSize: 14,
                cursor: finishing ? 'not-allowed' : 'pointer', opacity: finishing ? 0.7 : 1,
              }}
            >
              {finishing ? 'Finishing…' : 'Complete Delivery'}
            </button>
          </div>
        ) : (
          <>
            {/* Method toggle */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => setMethod('mpesa')}
                style={{
                  flex: 1, padding: '11px', borderRadius: 12, fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
                  background: method === 'mpesa' ? '#15803d' : '#fff',
                  color: method === 'mpesa' ? '#fff' : '#334155',
                  border: method === 'mpesa' ? 'none' : '1px solid #e2e8f0',
                }}
              >
                📱 M-Pesa
              </button>
              <button
                onClick={() => setMethod('cash')}
                style={{
                  flex: 1, padding: '11px', borderRadius: 12, fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
                  background: method === 'cash' ? '#15803d' : '#fff',
                  color: method === 'cash' ? '#fff' : '#334155',
                  border: method === 'cash' ? 'none' : '1px solid #e2e8f0',
                }}
              >
                💵 Cash
              </button>
            </div>

            {method === 'mpesa' ? (
              <div style={{ background: '#fff', borderRadius: 16, padding: 18, marginTop: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}>
                <label style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 700 }}>CUSTOMER PHONE</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  disabled={stkStatus === 'waiting' || stkStatus === 'sending'}
                  style={{
                    width: '100%', marginTop: 6, marginBottom: 14, padding: '11px 12px',
                    border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: FONT_FAMILY,
                  }}
                />

                {stkStatus === 'waiting' ? (
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>⏳</div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#334155' }}>Waiting for the customer to enter their M-Pesa PIN…</div>
                  </div>
                ) : (
                  <button
                    onClick={handleSendStk}
                    disabled={stkStatus === 'sending' || !phone}
                    style={{
                      width: '100%', background: '#15803d', color: '#fff', border: 'none',
                      borderRadius: 12, padding: '13px', fontWeight: 800, fontSize: 14,
                      cursor: stkStatus === 'sending' ? 'not-allowed' : 'pointer', opacity: stkStatus === 'sending' ? 0.7 : 1,
                    }}
                  >
                    {stkStatus === 'sending' ? 'Sending request…' : 'Send Payment Request'}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 16, padding: 18, marginTop: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}>
                <label style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 700 }}>CASH RECEIVED (KSh)</label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={String(amountDue)}
                  style={{
                    width: '100%', marginTop: 6, marginBottom: 14, padding: '11px 12px',
                    border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: FONT_FAMILY,
                  }}
                />
                <button
                  onClick={handleConfirmCash}
                  disabled={finishing}
                  style={{
                    width: '100%', background: '#15803d', color: '#fff', border: 'none',
                    borderRadius: 12, padding: '13px', fontWeight: 800, fontSize: 14,
                    cursor: finishing ? 'not-allowed' : 'pointer', opacity: finishing ? 0.7 : 1,
                  }}
                >
                  {finishing ? 'Recording…' : 'Confirm Cash Received'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentFlow;