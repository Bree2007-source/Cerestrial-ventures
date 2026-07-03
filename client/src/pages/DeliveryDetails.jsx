import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import useSocket from '../hooks/useSocket';

const F_DISPLAY = "'Space Grotesk', 'Segoe UI', sans-serif";
const F_BODY = "'IBM Plex Sans', 'Segoe UI', sans-serif";
const F_MONO = "'IBM Plex Mono', 'Courier New', monospace";

const T = {
  ink: '#142420',
  paper: '#F1F4EF',
  card: '#FFFFFF',
  green: '#146C43',
  greenDark: '#0F4A30',
  amber: '#D98E1F',
  amberBg: '#FBEEDA',
  red: '#B23A2E',
  redBg: '#FBEAE7',
  slate: '#64766D',
  line: '#E2E7E1',
};

const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token');

const STATUS_STEPS = ['Assigned to Driver', 'Driver On The Way', 'Arrived', 'Delivered'];
const STEP_LABELS = ['Assigned', 'En route', 'Arrived', 'Delivered'];

// Read-only manifest — the driver's actual workflow (Start Delivery, I've
// Arrived, Collect Payment, Complete Delivery) all live on the live map
// screen (DeliveryProgress.jsx) now. This screen is reachable any time via
// "View Delivery Details" and just shows the waybill: contact, items,
// total, payment status, and where things stand — plus Cancel, which stays
// here as a safety action a driver might reach for from either screen.
const DeliveryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useSocket({ joinOrder: id });

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}`);
      if (!res.ok) throw new Error('Order not found');
      const data = await res.json();
      setOrder(data);
    } catch {
      setError('Could not load this delivery.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchOrder();
    socket.on('order_status_changed', refresh);
    socket.on('payment_status_changed', refresh);
    return () => {
      socket.off('order_status_changed', refresh);
      socket.off('payment_status_changed', refresh);
    };
  }, [socket, fetchOrder]);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this delivery? This cannot be undone.')) return;
    setCancelling(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/cancel-delivery`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Could not cancel this delivery.');
        return;
      }
      navigate('/driver-dashboard');
    } catch {
      setError('Network error — please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.slate, fontFamily: F_BODY, background: T.paper }}>
        Loading…
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, fontFamily: F_BODY, background: T.paper }}>
        <div style={{ color: T.red, fontWeight: 600 }}>{error || 'Delivery not found.'}</div>
        <button onClick={() => navigate('/driver-dashboard')} style={{ color: T.green, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F_BODY }}>
          ← Back to dashboard
        </button>
      </div>
    );
  }

  const stepIndex = STATUS_STEPS.indexOf(order.status);
  const alreadyPaid = order.paymentStatus === 'Paid';
  const waybillCode = order._id ? order._id.slice(-6).toUpperCase() : '------';
  const isActive = !['Delivered', 'Completed', 'Cancelled'].includes(order.status);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: T.paper, paddingBottom: 40, fontFamily: F_BODY }}>

      {/* Header — torn waybill stub */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${T.green} 0%, ${T.greenDark} 100%)`,
        padding: '20px 20px 34px', color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: 0.9, fontFamily: F_BODY, padding: 0 }}
          >
            ← Back
          </button>
          <span style={{ fontFamily: F_MONO, fontSize: 11, letterSpacing: 1, background: 'rgba(255,255,255,0.14)', padding: '4px 8px', borderRadius: 4 }}>
            WB-{waybillCode}
          </span>
        </div>
        <div style={{ fontFamily: F_DISPLAY, fontWeight: 600, fontSize: 21 }}>{order.customerName}</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, lineHeight: 1.5 }}>{order.location}</div>

        {/* Scalloped tear edge */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: -1, height: 16,
          backgroundColor: T.greenDark,
          backgroundImage: `radial-gradient(circle at 10px 8px, ${T.paper} 7px, transparent 7.5px)`,
          backgroundSize: '20px 16px',
          backgroundRepeat: 'repeat-x',
        }} />
      </div>

      <div style={{ padding: '0 16px', marginTop: 20 }}>

        {error && (
          <div style={{ background: T.redBg, border: `1px solid ${T.red}33`, color: T.red, fontSize: 12, padding: '10px 12px', borderRadius: 10, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {isActive && (
          <button
            onClick={() => navigate(`/delivery-progress/${id}`)}
            style={{
              width: '100%', background: T.card, color: T.green, border: `1px solid ${T.green}55`,
              borderRadius: 10, padding: '12px', fontWeight: 600, fontSize: 13.5, fontFamily: F_BODY,
              cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            🗺️ Open Live Map
          </button>
        )}

        {/* Status tracker — stamped checkpoints */}
        <div style={{ background: T.card, borderRadius: 12, padding: '18px 16px 14px', border: `1px solid ${T.line}`, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 34, left: 40, right: 40, borderTop: `2px dashed ${T.line}` }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
            {STEP_LABELS.map((label, i) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', margin: '0 auto 6px',
                  background: T.card,
                  border: `2px solid ${i <= stepIndex ? T.green : T.line}`,
                  color: i <= stepIndex ? T.green : T.slate,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 500, fontFamily: F_MONO,
                  transform: `rotate(${i % 2 === 0 ? -4 : 3}deg)`,
                }}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 9.5, color: i <= stepIndex ? T.green : T.slate, fontWeight: 500, fontFamily: F_MONO, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{ background: T.card, borderRadius: 12, padding: 14, marginTop: 12, border: `1px solid ${T.line}`, display: 'flex', gap: 10 }}>
          <a
            href={`tel:${order.phone}`}
            style={{ flex: 1, background: `${T.green}14`, color: T.green, textAlign: 'center', padding: '11px', borderRadius: 8, fontWeight: 500, fontSize: 13.5, textDecoration: 'none' }}
          >
            📞 {order.phone}
          </a>
          {order.coordinates?.lat && order.coordinates?.lng && (
            <a
              href={`https://www.google.com/maps?q=${order.coordinates.lat},${order.coordinates.lng}`}
              target="_blank" rel="noreferrer"
              style={{ flex: 1, background: T.paper, color: T.ink, textAlign: 'center', padding: '11px', borderRadius: 8, fontWeight: 500, fontSize: 13.5, textDecoration: 'none', border: `1px solid ${T.line}` }}
            >
              🗺️ Navigate
            </a>
          )}
        </div>

        {/* Items — receipt style */}
        <div style={{ background: T.card, borderRadius: 12, padding: 16, marginTop: 12, border: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 10.5, color: T.slate, fontWeight: 500, letterSpacing: 1, marginBottom: 12, fontFamily: F_MONO, textTransform: 'uppercase' }}>
            Order manifest
          </div>
          {(order.items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '5px 0' }}>
              <span style={{ color: T.ink, fontSize: 13.5, whiteSpace: 'nowrap' }}>{item.quantity} × {item.name}</span>
              <span style={{ flex: 1, borderBottom: `1px dotted ${T.line}`, marginBottom: 3 }} />
              <span style={{ color: T.ink, fontWeight: 500, fontSize: 13.5, fontFamily: F_MONO, whiteSpace: 'nowrap' }}>
                {(item.price * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
            <span style={{ fontWeight: 500, color: T.ink, fontFamily: F_DISPLAY, fontSize: 15 }}>Total</span>
            <span style={{ fontWeight: 600, color: T.green, fontSize: 18, fontFamily: F_MONO }}>
              KSh {((order.totalAmount || 0) + (order.deliveryFee || 0) - (order.discount || 0)).toLocaleString()}
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={{
              display: 'inline-block', fontFamily: F_MONO, fontSize: 10.5, fontWeight: 500, letterSpacing: 0.6,
              textTransform: 'uppercase', padding: '4px 9px', borderRadius: 4,
              transform: 'rotate(-2deg)',
              color: alreadyPaid ? T.green : T.amber,
              background: alreadyPaid ? `${T.green}14` : T.amberBg,
              border: `1px dashed ${alreadyPaid ? T.green : T.amber}`,
            }}>
              {alreadyPaid ? '✓ Payment received' : 'Payment pending'}
            </span>
          </div>
        </div>

        {/* Perforated tear line before actions */}
        <div style={{
          height: 14, marginTop: 16,
          backgroundImage: `radial-gradient(circle at 10px 7px, ${T.card} 5px, transparent 5.5px)`,
          backgroundSize: '20px 14px',
          backgroundRepeat: 'repeat-x',
          backgroundColor: 'transparent',
          borderTop: `1px dashed ${T.line}`,
        }} />

        {/* Cancel — the one workflow action kept here as a safety valve,
            reachable regardless of which screen the driver is on. */}
        {isActive && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{ width: '100%', background: T.card, color: T.red, border: `1px solid ${T.red}55`, borderRadius: 10, padding: '13px', fontWeight: 500, fontSize: 14, cursor: cancelling ? 'not-allowed' : 'pointer', fontFamily: F_BODY }}
          >
            {cancelling ? 'Cancelling…' : 'Cancel delivery'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DeliveryDetails;