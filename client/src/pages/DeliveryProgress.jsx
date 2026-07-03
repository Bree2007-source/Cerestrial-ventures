import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import useSocket from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';

const FONT_FAMILY = "'Poppins', 'Segoe UI', sans-serif";
const GREEN  = '#166534';
const BORDER = '#e2e8f0';
const INK    = '#0f172a';
const MUTED  = '#64748b';

// ── Leaflet loader — same CDN-load pattern used in MyDeliveries.jsx ────────
let leafletLoadPromise = null;
function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css-link')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-link';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Could not load map library.'));
    document.body.appendChild(script);
  });

  return leafletLoadPromise;
}

// Haversine, km — used client-side only to decide when it's worth
// re-querying OSRM, mirrors the 150m gate the backend uses for its own
// recompute so we're not hammering the public demo server on every GPS tick.
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const ROUTE_REFRESH_KM = 0.05; // ~50m before re-querying OSRM

const formatDuration = (min) => {
  if (min == null) return '—';
  if (min >= 60) return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
  return `${Math.round(min)} min`;
};

const STEP_ORDER = ['Assigned to Driver', 'Driver On The Way', 'Arrived', 'Payment Confirmed', 'Delivered'];
const STEP_LABELS = {
  'Assigned to Driver': 'Assigned',
  'Driver On The Way':  'On the Way',
  Arrived:              'Arrived',
  'Payment Confirmed':  'Payment Confirmed',
  Delivered:            'Completed',
};

const DeliveryProgress = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [mpesaInput, setMpesaInput] = useState('');

  const socket = useSocket({ joinOrder: id });
  const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token');

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}`);
      if (res.ok) setOrder(await res.json());
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

  const isCancelled  = order?.status === 'Cancelled';
  const isDelivered  = order?.status === 'Delivered';
  const isActive     = order && !isCancelled && !isDelivered;
  const isArrived    = order?.status === 'Arrived';
  const isPaid       = order?.paymentStatus === 'Paid';

  // ── Live position tracking (only while the delivery is actually active) ──
  const [driverPos, setDriverPos] = useState(null);
  const [geoError, setGeoError] = useState('');
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!isActive || typeof navigator === 'undefined' || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverPos(next);
        setGeoError('');

        // Fire-and-forget — same pattern the dashboard already uses to feed
        // PATCH /drivers/:driverId/location on every tick.
        if (user?._id) {
          fetch(`${API_BASE_URL}/drivers/${user._id}/location`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ lat: next.lat, lng: next.lng }),
          }).catch(() => {});
        }
      },
      () => setGeoError('Could not read your location. Enable GPS to see live directions.'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, user?._id]);

  // ── OSRM route line (driver → destination), re-fetched only after
  // meaningful movement to avoid hammering the public demo server ──────────
  const [routeCoords, setRouteCoords] = useState(null);   // [[lat,lng], ...]
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [routeDurationMin, setRouteDurationMin] = useState(null);
  const [routeError, setRouteError] = useState('');
  const lastRouteFetchPosRef = useRef(null);

  // Some orders don't have order.coordinates saved (e.g. the address was
  // typed in free-text and never geocoded on creation). Rather than
  // silently showing a blank map in that case, fall back to geocoding the
  // address text client-side via Nominatim (OpenStreetMap's free geocoder
  // — same free-tier spirit as the OSRM routing already in use here).
  const savedCoords = useMemo(() => {
    if (!order?.coordinates?.lat || !order?.coordinates?.lng) return null;
    return { lat: order.coordinates.lat, lng: order.coordinates.lng };
  }, [order]);

  const [geocodedCoords, setGeocodedCoords] = useState(null);
  const [geocodeStatus, setGeocodeStatus] = useState('idle'); // idle | loading | done | failed
  const geocodeAttemptedFor = useRef(null);

  useEffect(() => {
    if (savedCoords || !order?.location) return;
    if (geocodeAttemptedFor.current === order.location) return;
    geocodeAttemptedFor.current = order.location;

    setGeocodeStatus('loading');
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(order.location)}`;

    fetch(url)
      .then((r) => r.json())
      .then((results) => {
        const hit = results?.[0];
        if (!hit) { setGeocodeStatus('failed'); return; }
        setGeocodedCoords({ lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) });
        setGeocodeStatus('done');
      })
      .catch(() => setGeocodeStatus('failed'));
  }, [savedCoords, order?.location]);

  const destination = savedCoords || geocodedCoords;
  const destinationIsApproximate = !savedCoords && !!geocodedCoords;
  const destinationUnavailable = !savedCoords && geocodeStatus === 'failed';

  useEffect(() => {
    if (!driverPos || !destination) return;

    const last = lastRouteFetchPosRef.current;
    const moved = !last || distanceKm(last.lat, last.lng, driverPos.lat, driverPos.lng) >= ROUTE_REFRESH_KM;
    if (!moved) return;

    lastRouteFetchPosRef.current = driverPos;

    const url = `https://router.project-osrm.org/route/v1/driving/${driverPos.lng},${driverPos.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const route = data?.routes?.[0];
        if (!route) { setRouteError('No route found.'); return; }
        setRouteCoords(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        setRouteDistanceKm(route.distance / 1000);
        setRouteDurationMin(route.duration / 60);
        setRouteError('');
      })
      .catch(() => setRouteError('Could not fetch directions.'));
  }, [driverPos, destination]);

  // ── Map ────────────────────────────────────────────────────────────────
  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef   = useRef(null);
  const routeLineRef    = useRef(null);
  const [mapLoadError, setMapLoadError] = useState('');
  const [hasFitBounds, setHasFitBounds] = useState(false);

  useEffect(() => {
    if (!isActive || !destination) return;
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !L || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = L.map(mapContainerRef.current, { zoomControl: false })
            .setView([destination.lat, destination.lng], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
          }).addTo(mapInstanceRef.current);
          L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);

          destMarkerRef.current = L.marker([destination.lat, destination.lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="background:${GREEN};color:#fff;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff;"><span style="transform:rotate(45deg);font-size:15px;">🏪</span></div>`,
              iconSize: [34, 34],
              iconAnchor: [17, 34],
            }),
          }).addTo(mapInstanceRef.current);
        }
      })
      .catch(() => setMapLoadError('Could not load the map. Check your connection and try again.'));

    return () => { cancelled = true; };
  }, [isActive, destination]);

  // Update driver marker + route line as data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;
    const L = window.L;

    if (driverPos) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.marker([driverPos.lat, driverPos.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#2563eb;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);">🏍️</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(map);
      } else {
        driverMarkerRef.current.setLatLng([driverPos.lat, driverPos.lng]);
      }
    }

    if (routeCoords && routeCoords.length > 1) {
      if (routeLineRef.current) map.removeLayer(routeLineRef.current);
      routeLineRef.current = L.polyline(routeCoords, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(map);
    }

    if (!hasFitBounds && driverPos && destination) {
      map.fitBounds([[driverPos.lat, driverPos.lng], [destination.lat, destination.lng]], { padding: [60, 60] });
      setHasFitBounds(true);
    }
  }, [driverPos, routeCoords, destination, hasFitBounds]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        driverMarkerRef.current = null;
        destMarkerRef.current = null;
        routeLineRef.current = null;
      }
    };
  }, []);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map || !driverPos || !destination) return;
    map.fitBounds([[driverPos.lat, driverPos.lng], [destination.lat, destination.lng]], { padding: [60, 60] });
  };

  // ── Actions ────────────────────────────────────────────────────────────
  const handleCall = () => {
    if (!order?.phone) return;
    window.location.href = `tel:${order.phone}`;
  };

  const handleArrived = async () => {
    setActionError('');
    setArriving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/mark-arrived`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.message || 'Could not mark as arrived.'); return; }
      setOrder(data);
    } catch {
      setActionError('Network error — please try again.');
    } finally {
      setArriving(false);
    }
  };

  const confirmPayment = async (mpesaCode) => {
    setActionError('');
    setConfirmingPayment(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ paymentStatus: 'Paid', mpesaCode: mpesaCode || 'CASH' }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.message || 'Could not confirm payment.'); return; }
      setOrder(data);
      setShowPaymentPanel(false);
      setMpesaInput('');
    } catch {
      setActionError('Network error — please try again.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleComplete = async () => {
    setActionError('');
    setCompleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/complete-delivery`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.message || 'Could not complete this delivery.'); return; }
      setOrder(data);
    } catch {
      setActionError('Network error — please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this delivery? This cannot be undone.')) return;
    setActionError('');
    setCancelling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/cancel-delivery`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.message || 'Could not cancel this delivery.'); return; }
      navigate('/driver-dashboard');
    } catch {
      setActionError('Network error — please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_FAMILY, color: MUTED }}>
        Loading…
      </div>
    );
  }

  // ── Non-active states (Delivered / Cancelled) — simple summary, no map ──
  if (!isActive) {
    const statusIndex = STEP_ORDER.indexOf(order.status);
    const simpleSteps = [
      { label: 'Assigned',          completed: statusIndex >= 0 || isDelivered },
      { label: 'On the Way',        completed: statusIndex >= 1 || isDelivered },
      { label: 'Arrived',           completed: statusIndex >= 2 || isDelivered },
      { label: 'Payment Confirmed', completed: isPaid },
      { label: 'Completed',         completed: isDelivered },
    ];

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff', fontFamily: FONT_FAMILY, padding: '20px 20px 40px' }}>
        <button onClick={() => navigate('/driver-dashboard')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 700, color: '#334155', cursor: 'pointer', marginBottom: 16 }}>
          ← Back
        </button>
        <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 2, color: INK }}>
          Order #{order.receiptNumber || order._id.slice(-6).toUpperCase()}
        </h2>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>{order.customerName} · {order.location}</p>

        {isCancelled && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, fontWeight: 700, padding: '12px 14px', borderRadius: 12, marginBottom: 20, textAlign: 'center' }}>
            This delivery was cancelled.
          </div>
        )}
        {isDelivered && (
          <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: GREEN, fontSize: 13, fontWeight: 700, padding: '12px 14px', borderRadius: 12, marginBottom: 20, textAlign: 'center' }}>
            ✅ Delivered successfully.
          </div>
        )}

        <div style={{ position: 'relative', paddingLeft: 32 }}>
          <div style={{ position: 'absolute', left: 11, top: 8, bottom: 8, width: 2, background: '#e2e8f0' }} />
          {simpleSteps.map((step, index) => (
            <div key={index} style={{ position: 'relative', marginBottom: 28, display: 'flex', alignItems: 'flex-start' }}>
              <div style={{
                position: 'absolute', left: -32, width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${step.completed ? GREEN : '#cbd5e1'}`,
                background: step.completed ? GREEN : '#fff',
              }}>
                {step.completed && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>}
              </div>
              <div>
                <p style={{ fontWeight: 800, color: step.completed ? GREEN : '#94a3b8', margin: 0 }}>{step.label}</p>
                <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '2px 0 0' }}>{step.completed ? 'Done' : 'Pending'}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate(`/delivery-details/${id}`)}
          style={{ width: '100%', background: GREEN, color: '#fff', padding: '15px', borderRadius: 12, fontWeight: 800, fontSize: 14.5, border: 'none', cursor: 'pointer' }}
        >
          View Delivery Details
        </button>
      </div>
    );
  }

  // ── Active state — full-screen map centerpiece ──────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', fontFamily: FONT_FAMILY, display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; }`}</style>

      {/* ── Map fills the screen ── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* ── Top overlay: back + order info + distance/ETA banner ── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => navigate('/driver-dashboard')}
            style={{ background: '#fff', border: 'none', borderRadius: 10, width: 38, height: 38, fontSize: 16, fontWeight: 700, color: INK, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.25)' }}
          >
            ←
          </button>
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '8px 14px', boxShadow: '0 2px 8px rgba(0,0,0,.25)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              🏪 {order.shopName || order.businessName || order.location}
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>👤 {order.customerName}</div>
          </div>
          <button
            onClick={handleRecenter}
            title="Recenter"
            style={{ background: '#fff', border: 'none', borderRadius: 10, width: 38, height: 38, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.25)' }}
          >
            🎯
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,.25)', marginBottom: 10 }}>
          {destinationUnavailable ? (
            <div>
              <div style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 700, marginBottom: 6 }}>
                ⚠️ Couldn't find this location on the map automatically.
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.location)}`}
                target="_blank" rel="noreferrer"
                style={{ fontSize: 12.5, color: GREEN, fontWeight: 700, textDecoration: 'none' }}
              >
                🗺️ Search "{order.location}" in Google Maps →
              </a>
            </div>
          ) : !destination ? (
            <div style={{ fontSize: 12.5, color: MUTED }}>
              📍 Locating delivery address…
            </div>
          ) : routeDistanceKm != null ? (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: INK }}>📏 {routeDistanceKm.toFixed(1)} km</span>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: GREEN }}>🕒 ETA {formatDuration(routeDurationMin)}</span>
              {destinationIsApproximate && (
                <span style={{ fontSize: 10.5, color: MUTED, fontWeight: 600 }}>· approximate location</span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: MUTED }}>
              {mapLoadError || geoError || routeError || 'Getting your live location…'}
            </div>
          )}
        </div>

        {actionError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12.5, padding: '10px 12px', borderRadius: 12, marginBottom: 10 }}>
            {actionError}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* ── Bottom sheet: status + payment + actions ── */}
      <div style={{ position: 'relative', zIndex: 10, background: '#fff', borderRadius: '20px 20px 0 0', padding: '16px 16px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,.25)' }}>
        <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 999, margin: '0 auto 14px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{
            fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 999,
            background: isArrived ? '#ede9fe' : '#dbeafe',
            color: isArrived ? '#6d28d9' : '#1d4ed8',
          }}>
            {isArrived ? '📍 Arrived' : '🚚 On the Way'}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 999,
            background: isPaid ? '#dcfce7' : '#fef3c7',
            color: isPaid ? GREEN : '#92400e',
          }}>
            {isPaid ? '✅ Paid' : '💰 Payment Pending'}
          </span>
        </div>

        <div style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>
          📍 {order.location}
        </div>

        {/* Payment collection panel */}
        {isArrived && !isPaid && showPaymentPanel && (
          <div style={{ background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
            {order.paymentMethod === 'M-Pesa' ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 6 }}>Enter M-Pesa confirmation code</div>
                <input
                  type="text"
                  value={mpesaInput}
                  onChange={(e) => setMpesaInput(e.target.value.toUpperCase())}
                  placeholder="e.g. QAB1CD2EFG"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, marginBottom: 10, fontFamily: 'inherit' }}
                />
                <button
                  onClick={() => confirmPayment(mpesaInput)}
                  disabled={!mpesaInput.trim() || confirmingPayment}
                  style={{ width: '100%', background: GREEN, color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontWeight: 800, fontSize: 13, cursor: !mpesaInput.trim() ? 'not-allowed' : 'pointer', opacity: !mpesaInput.trim() ? 0.6 : 1 }}
                >
                  {confirmingPayment ? 'Confirming…' : 'Confirm Payment'}
                </button>
              </>
            ) : (
              <button
                onClick={() => confirmPayment('CASH')}
                disabled={confirmingPayment}
                style={{ width: '100%', background: GREEN, color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
              >
                {confirmingPayment ? 'Confirming…' : '💵 Confirm Cash Received'}
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: order.phone ? '1fr 2fr' : '1fr', gap: 8, marginBottom: 8 }}>
          {order.phone && (
            <button
              onClick={handleCall}
              style={{ padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 13, background: '#fff', color: INK, border: `1.5px solid ${BORDER}`, cursor: 'pointer' }}
            >
              📞 Call
            </button>
          )}

          {!isArrived && (
            <button
              onClick={handleArrived}
              disabled={arriving}
              style={{ padding: '13px 0', borderRadius: 12, fontWeight: 800, fontSize: 13.5, background: GREEN, color: '#fff', border: 'none', cursor: arriving ? 'not-allowed' : 'pointer' }}
            >
              {arriving ? 'Marking…' : '📍 I\'ve Arrived'}
            </button>
          )}

          {isArrived && !isPaid && !showPaymentPanel && (
            <button
              onClick={() => setShowPaymentPanel(true)}
              style={{ padding: '13px 0', borderRadius: 12, fontWeight: 800, fontSize: 13.5, background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              💰 Collect Payment
            </button>
          )}

          {isArrived && isPaid && (
            <button
              onClick={handleComplete}
              disabled={completing}
              style={{ padding: '13px 0', borderRadius: 12, fontWeight: 800, fontSize: 13.5, background: GREEN, color: '#fff', border: 'none', cursor: completing ? 'not-allowed' : 'pointer' }}
            >
              {completing ? 'Completing…' : '✅ Complete Delivery'}
            </button>
          )}
        </div>

        <button
          onClick={() => navigate(`/delivery-details/${id}`)}
          style={{ width: '100%', background: 'none', border: 'none', color: MUTED, fontWeight: 700, fontSize: 12.5, padding: '8px 0', cursor: 'pointer' }}
        >
          View Delivery Details
        </button>

        <button
          onClick={handleCancel}
          disabled={cancelling}
          style={{ width: '100%', border: '1.5px solid #fecaca', color: '#dc2626', background: '#fff', padding: '11px', borderRadius: 12, fontWeight: 700, fontSize: 12.5, cursor: cancelling ? 'not-allowed' : 'pointer' }}
        >
          {cancelling ? 'Cancelling…' : 'Cancel Delivery'}
        </button>
      </div>
    </div>
  );
};

export default DeliveryProgress;