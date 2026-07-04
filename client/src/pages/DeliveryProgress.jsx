import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import useSocket from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { useDriverLocation } from '../context/DriverLocationContext';

const FONT_FAMILY = "'Poppins', 'Segoe UI', sans-serif";

// ── Leaflet loader — same CDN pattern already used in MyDeliveries.jsx /
// MapView.jsx, duplicated locally rather than shared to match how the rest
// of the driver panel is structured (each screen loads it once, lazily).
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

// Haversine distance in km — used only to decide whether the driver has
// moved far enough to justify asking OSRM for a fresh route (throttling,
// same idea as the backend's SIGNIFICANT_MOVE_KM gate).
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ROUTE_REFETCH_MIN_KM = 0.05;   // ~50m moved
const ROUTE_REFETCH_MIN_MS = 20000;  // or 20s elapsed, whichever comes first

const formatDuration = (min) => {
  if (min == null) return '—';
  if (min >= 60) return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
  return `${Math.round(min)} min`;
};

const formatClockTime = (date) =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const T = {
  bg: '#0B0F14',
  panel: '#12181F',
  panelBorder: '#232B34',
  ink: '#F2F5F7',
  muted: '#8B98A5',
  green: '#22C55E',
  greenDark: '#15803D',
  red: '#EF4444',
  amber: '#F59E0B',
};

const DeliveryProgress = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const [driverStops, setDriverStops] = useState([]); // this driver's other active stops, for "Next Stops" + position badge
  const [routeInfo, setRouteInfo] = useState(null);     // { latlngs, distanceKm, durationMin }
  const [routeError, setRouteError] = useState('');

  // Live position now comes from the single shared tracker (mounted once
  // at the app root in App.jsx) instead of this screen running its own
  // watchPosition — previously every driver page had its own GPS watch,
  // which is what caused this screen to sometimes show a stale/approximate
  // fix instead of the same live position every other screen had.
  const { position: driverPos, locationError } = useDriverLocation();

  const socket = useSocket({ joinOrder: id });
  const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token');

  // ── Order + driver's other active stops ───────────────────────────────
  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}`);
      if (res.ok) setOrder(await res.json());
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchDriverStops = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/drivers/${user._id}/orders`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => {
        const da = typeof a.routeDistanceKm === 'number' ? a.routeDistanceKm : Number.MAX_SAFE_INTEGER;
        const db = typeof b.routeDistanceKm === 'number' ? b.routeDistanceKm : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
      setDriverStops(sorted);
    } catch {
      // non-critical — "next stops" preview just won't populate
    }
  }, [user?._id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);
  useEffect(() => { fetchDriverStops(); }, [fetchDriverStops]);

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

  // Falls back to the driver's last known server-side location (populated
  // on the order via `driver.currentLocation`) until a live GPS fix lands.
  const effectiveDriverPos = driverPos
    || (order?.driver?.currentLocation?.lat && order?.driver?.currentLocation?.lng
      ? { lat: order.driver.currentLocation.lat, lng: order.driver.currentLocation.lng }
      : null);

  const destCoords = order?.coordinates?.lat && order?.coordinates?.lng ? order.coordinates : null;

  // ── OSRM route line (public demo server, called directly from the browser) ──
  const lastFetchRef = useRef({ lat: null, lng: null, at: 0 });

  useEffect(() => {
    if (!effectiveDriverPos || !destCoords) return;

    const { lat: prevLat, lng: prevLng, at } = lastFetchRef.current;
    const movedFar = prevLat == null || distanceKm(prevLat, prevLng, effectiveDriverPos.lat, effectiveDriverPos.lng) >= ROUTE_REFETCH_MIN_KM;
    const timeElapsed = Date.now() - at >= ROUTE_REFETCH_MIN_MS;
    if (!movedFar && !timeElapsed) return;

    let cancelled = false;
    lastFetchRef.current = { lat: effectiveDriverPos.lat, lng: effectiveDriverPos.lng, at: Date.now() };

    const url = `https://router.project-osrm.org/route/v1/driving/${effectiveDriverPos.lng},${effectiveDriverPos.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const route = data?.routes?.[0];
        if (!route) { setRouteError('Could not calculate a route.'); return; }
        const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setRouteInfo({
          latlngs,
          distanceKm: route.distance / 1000,
          durationMin: route.duration / 60,
        });
        setRouteError('');
      })
      .catch(() => { if (!cancelled) setRouteError('Could not reach the routing service.'); });

    return () => { cancelled = true; };
  }, [effectiveDriverPos, destCoords]);

  // ── Map rendering ──────────────────────────────────────────────────────
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !L || !mapContainerRef.current || mapRef.current) return;
      mapRef.current = L.map(mapContainerRef.current, { zoomControl: true }).setView([-1.286389, 36.817223], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 20,
      }).addTo(mapRef.current);
      setMapReady(true);
    });
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  const recenterMap = useCallback(() => {
    const L = window.L;
    if (!L || !mapRef.current) return;
    const points = [effectiveDriverPos, destCoords].filter(Boolean).map((p) => [p.lat, p.lng]);
    if (points.length === 2) mapRef.current.fitBounds(points, { padding: [60, 60] });
    else if (points.length === 1) mapRef.current.setView(points[0], 15);
  }, [effectiveDriverPos, destCoords]);

  // Driver marker
  useEffect(() => {
    const L = window.L;
    if (!L || !mapReady || !mapRef.current || !effectiveDriverPos) return;
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:22px;height:22px;border-radius:50%;background:#3B82F6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,0.25);"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker([effectiveDriverPos.lat, effectiveDriverPos.lng], { icon }).addTo(mapRef.current);
    } else {
      driverMarkerRef.current.setLatLng([effectiveDriverPos.lat, effectiveDriverPos.lng]);
    }
  }, [effectiveDriverPos, mapReady]);

  // Destination marker
  useEffect(() => {
    const L = window.L;
    if (!L || !mapReady || !mapRef.current || !destCoords) return;
    const icon = L.divIcon({
      className: '',
      html: `<div style="font-size:26px;line-height:1;transform:translateY(-4px);">📍</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    });
    if (!destMarkerRef.current) {
      destMarkerRef.current = L.marker([destCoords.lat, destCoords.lng], { icon }).addTo(mapRef.current);
    } else {
      destMarkerRef.current.setLatLng([destCoords.lat, destCoords.lng]);
    }
  }, [destCoords, mapReady]);

  // Route polyline + initial fit
  const hasFitOnceRef = useRef(false);
  useEffect(() => {
    const L = window.L;
    if (!L || !mapReady || !mapRef.current) return;

    if (routeLineRef.current) {
      mapRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
    if (routeInfo?.latlngs?.length) {
      routeLineRef.current = L.polyline(routeInfo.latlngs, { color: '#3B82F6', weight: 5, opacity: 0.9 }).addTo(mapRef.current);
    }

    if (!hasFitOnceRef.current && effectiveDriverPos && destCoords) {
      recenterMap();
      hasFitOnceRef.current = true;
    }
  }, [routeInfo, mapReady, effectiveDriverPos, destCoords, recenterMap]);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleNavigateExternal = () => {
    if (!destCoords) return;
    window.open(`https://www.google.com/maps?q=${destCoords.lat},${destCoords.lng}`, '_blank');
  };

  const handleMarkArrived = async () => {
    setActionBusy(true);
    setActionError('');
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/mark-arrived`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.message || 'Could not update this delivery.'); return; }
      setOrder(data);
    } catch {
      setActionError('Network error — please try again.');
    } finally {
      setActionBusy(false);
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_FAMILY, color: T.muted, background: T.bg }}>
        Loading…
      </div>
    );
  }

  const readyForPayment = order.status === 'Arrived';
  const alreadyPaid = order.paymentStatus === 'Paid';
  const isDelivered = order.status === 'Delivered';
  const isCancelled = order.status === 'Cancelled';

  // Distance/ETA: prefer the live OSRM route, fall back to the backend's
  // last-computed values (from recomputeDriverRoute) while OSRM loads.
  const liveDistanceKm = routeInfo?.distanceKm ?? order.routeDistanceKm ?? null;
  const liveDurationMin = routeInfo?.durationMin ?? order.routeDurationMin ?? null;
  const eta = liveDurationMin != null ? formatClockTime(new Date(Date.now() + liveDurationMin * 60000)) : null;

  const otherStops = driverStops.filter((s) => s._id !== order._id);
  const positionIndex = driverStops.findIndex((s) => s._id === order._id);
  const stopBadge = positionIndex >= 0 ? `${positionIndex + 1} of ${driverStops.length}` : null;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: T.bg, fontFamily: FONT_FAMILY, color: T.ink, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
        <button onClick={() => navigate('/driver-dashboard')} style={{ background: 'none', border: 'none', color: T.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, padding: 0 }}>
          ← <span>Delivery in Progress</span>
        </button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: T.green }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.green }} /> Live
        </span>
      </div>

      <div style={{ padding: '0 16px' }}>
        {actionError && (
          <div style={{ background: '#3B1414', border: `1px solid ${T.red}55`, color: '#FCA5A5', fontSize: 12.5, padding: '10px 12px', borderRadius: 10, marginBottom: 10 }}>
            {actionError}
          </div>
        )}
        {locationError && (
          <div style={{ background: '#3B2E10', border: `1px solid ${T.amber}55`, color: '#FCD34D', fontSize: 12, padding: '9px 12px', borderRadius: 10, marginBottom: 10 }}>
            {locationError}
          </div>
        )}
        {isCancelled && (
          <div style={{ background: '#3B1414', border: `1px solid ${T.red}55`, color: '#FCA5A5', fontSize: 13, fontWeight: 700, padding: '10px 12px', borderRadius: 10, marginBottom: 10, textAlign: 'center' }}>
            This delivery was cancelled.
          </div>
        )}

        {/* ── Current stop card ── */}
        <div style={{ background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.green, letterSpacing: 0.4, textTransform: 'uppercase' }}>Current Stop</span>
            {stopBadge && (
              <span style={{ background: '#1A2530', color: T.muted, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>{stopBadge}</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.greenDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🏪</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.customerName}</div>
              {order.phone && <div style={{ fontSize: 12, color: T.muted }}>{order.phone}</div>}
            </div>
            {order.phone && (
              <a href={`tel:${order.phone}`} style={{ marginLeft: 'auto', width: 34, height: 34, borderRadius: '50%', background: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 15, flexShrink: 0 }}>
                📞
              </a>
            )}
          </div>

          <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 12, display: 'flex', gap: 6 }}>
            <span>📍</span><span>{order.location}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ background: '#1A2530', borderRadius: 10, padding: '10px 0', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{liveDistanceKm != null ? `${liveDistanceKm.toFixed(1)} km` : '—'}</div>
              <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>Distance</div>
            </div>
            <div style={{ background: '#1A2530', borderRadius: 10, padding: '10px 0', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{formatDuration(liveDurationMin)}</div>
              <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>ETA</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.muted }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🧭</span>
            Proceed to the shop — follow the route below.
          </div>
        </div>

        {/* ── Next stops preview ── */}
        {otherStops.length > 0 && (
          <div style={{ background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 16, padding: '12px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' }}>Next Stops</span>
              <button onClick={() => navigate('/my-deliveries')} style={{ background: 'none', border: 'none', color: T.green, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>View all</button>
            </div>
            {otherStops.slice(0, 3).map((stop, i) => (
              <div
                key={stop._id}
                onClick={() => navigate(`/delivery-details/${stop._id}`)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#1A2530', color: T.muted, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {i + 2}
                  </span>
                  <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stop.customerName}</span>
                </div>
                <span style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>
                  {typeof stop.routeDistanceKm === 'number' ? `${stop.routeDistanceKm.toFixed(1)} km` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Map ── */}
      <div style={{ position: 'relative', flex: 1, minHeight: 380, margin: '0 16px 16px', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.panelBorder}` }}>
        {!destCoords && (
          <div style={{ position: 'absolute', inset: 0, background: T.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13, textAlign: 'center', padding: 20, zIndex: 5 }}>
            No location on file for this shop — use the customer's phone number above to confirm directions.
          </div>
        )}
        {routeError && destCoords && (
          <div style={{ position: 'absolute', top: 10, left: 10, right: 10, background: '#3B1414', border: `1px solid ${T.red}55`, color: '#FCA5A5', fontSize: 11.5, padding: '8px 10px', borderRadius: 8, zIndex: 10 }}>
            {routeError}
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 380 }} />

        <button
          onClick={recenterMap}
          style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(18,24,31,0.9)', color: T.ink, border: `1px solid ${T.panelBorder}`, borderRadius: 10, padding: '8px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, zIndex: 10 }}
        >
          🎯 Re-center
        </button>

        {liveDistanceKm != null && (
          <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(18,24,31,0.9)', border: `1px solid ${T.panelBorder}`, borderRadius: 10, padding: '8px 12px', zIndex: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: T.ink }}>
              {liveDistanceKm.toFixed(1)} km · {formatDuration(liveDurationMin)}
            </div>
            {eta && <div style={{ fontSize: 10.5, color: T.muted, marginTop: 1 }}>Estimated arrival {eta}</div>}
          </div>
        )}
      </div>

      {/* ── Bottom action bar ── */}
      <div style={{ background: T.panel, borderTop: `1px solid ${T.panelBorder}`, padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={handleNavigateExternal}
          disabled={!destCoords}
          style={{ flex: '1 1 120px', background: '#fff', color: '#0B0F14', border: 'none', borderRadius: 12, padding: '13px 0', fontWeight: 800, fontSize: 13.5, cursor: destCoords ? 'pointer' : 'not-allowed', opacity: destCoords ? 1 : 0.5 }}
        >
          🧭 Navigate
        </button>

        {!isDelivered && !isCancelled && order.status === 'Driver On The Way' && (
          <button
            onClick={handleMarkArrived}
            disabled={actionBusy}
            style={{ flex: '1 1 120px', background: '#1A2530', color: T.ink, border: `1px solid ${T.panelBorder}`, borderRadius: 12, padding: '13px 0', fontWeight: 800, fontSize: 13.5, cursor: actionBusy ? 'not-allowed' : 'pointer' }}
          >
            {actionBusy ? 'Updating…' : "✓ I've Arrived"}
          </button>
        )}

        {readyForPayment && !alreadyPaid && (
          <button
            onClick={() => navigate(`/delivery-payment/${order._id}`)}
            style={{ flex: '1 1 120px', background: '#1A2530', color: T.ink, border: `1px solid ${T.panelBorder}`, borderRadius: 12, padding: '13px 0', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}
          >
            💳 Collect Payment
          </button>
        )}

        {readyForPayment && alreadyPaid && !isDelivered && (
          <button
            onClick={() => navigate(`/delivery-payment/${order._id}`)}
            style={{ flex: '1 1 120px', background: T.green, color: '#06210F', border: 'none', borderRadius: 12, padding: '13px 0', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}
          >
            ✅ Complete Delivery
          </button>
        )}

        {isDelivered && (
          <button
            onClick={() => navigate('/driver-dashboard')}
            style={{ flex: '1 1 220px', background: T.green, color: '#06210F', border: 'none', borderRadius: 12, padding: '13px 0', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}
          >
            ✅ Delivered — Back to Dashboard
          </button>
        )}
      </div>

      {/* ── Secondary links ── */}
      {!isDelivered && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px 20px' }}>
          <button onClick={() => navigate(`/delivery-details/${id}`)} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            View full details
          </button>
          {!isCancelled && (
            <button onClick={handleCancel} disabled={cancelling} style={{ background: 'none', border: 'none', color: T.red, fontSize: 12, fontWeight: 600, cursor: cancelling ? 'not-allowed' : 'pointer', padding: 0 }}>
              {cancelling ? 'Cancelling…' : 'Cancel delivery'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryProgress;