import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import useSocket from '../hooks/useSocket';
import DriverBottomNav from '../components/DriverBottomNav';

// Loads Leaflet (JS + CSS) from a CDN once, the first time the map view is
// opened — same pattern as the Poppins font loader in DriverDashboard.jsx.
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

const GREEN  = '#166534';
const BORDER = '#e2e8f0';
const INK    = '#0f172a';
const MUTED  = '#64748b';
const BG     = '#f8fafc';

const PAYMENT_META = {
  Paid:             { label: 'Paid',             dot: '🟢', bg: '#dcfce7', color: '#166534' },
  'Cash on Delivery': { label: 'Cash on Delivery', dot: '🟠', bg: '#ffedd5', color: '#9a3412' },
  Pending:          { label: 'Pending',           dot: '🟡', bg: '#fef3c7', color: '#92400e' },
};
const getPaymentMeta = (status) => {
  if (status === 'Paid') return PAYMENT_META.Paid;
  if (!status || status === 'Pending') return PAYMENT_META.Pending;
  return PAYMENT_META['Cash on Delivery'];
};

const STATUS_META = {
  'Assigned to Driver': { label: 'Assigned',    dot: '🔵', bg: '#dbeafe', color: '#1d4ed8' },
  'Driver On The Way':  { label: 'In Progress', dot: '🟣', bg: '#ede9fe', color: '#6d28d9' },
  Arrived:               { label: 'In Progress', dot: '🟣', bg: '#ede9fe', color: '#6d28d9' },
  Delivered:             { label: 'Delivered',   dot: '🟢', bg: '#dcfce7', color: '#166534' },
};
const getStatusMeta = (status) => STATUS_META[status] || { label: status || 'Assigned', dot: '🔵', bg: '#dbeafe', color: '#1d4ed8' };

// Keeps just the first comma-separated segment of a full address for the
// card's short-location line — the full address stays in Delivery Details.
const shortenLocation = (location) => {
  if (!location) return '—';
  const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? `${parts[0]}, ${parts[1]}` : (parts[0] || location);
};

const formatDuration = (min) => {
  if (min >= 60) return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
  return `${Math.round(min)} min`;
};

const SkeletonCard = () => (
  <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 14 }}>
    <div style={{ display: 'flex', gap: 12 }}>
      <div className="cv-skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="cv-skel" style={{ width: '60%', height: 16, borderRadius: 4, marginBottom: 8 }} />
        <div className="cv-skel" style={{ width: '40%', height: 12, borderRadius: 4, marginBottom: 6 }} />
        <div className="cv-skel" style={{ width: '50%', height: 12, borderRadius: 4 }} />
      </div>
    </div>
  </div>
);

const MyDeliveries = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [deliveries, setDeliveries] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [startingId, setStartingId] = useState(null);

  const [view, setView] = useState('list');         // 'list' | 'map'
  const [sortBy, setSortBy] = useState('distance');  // 'distance' | 'shop' | 'recent'
  const [searchQuery, setSearchQuery] = useState('');

  const socket = useSocket({ joinDriver: user?._id });
  const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token');

  // ── Data fetching — UNCHANGED backend integration ─────────────────────────
  const fetchDeliveries = useCallback(async () => {
    if (!user?._id) return;

    try {
      setLoadingDeliveries(true);
      const res = await fetch(`${API_BASE_URL}/drivers/${user._id}/orders`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Could not load your deliveries.');
      }

      const sortedDeliveries = [...(Array.isArray(data) ? data : [])].sort((a, b) => {
        const distA = typeof a.routeDistanceKm === 'number' ? a.routeDistanceKm : Number.MAX_SAFE_INTEGER;
        const distB = typeof b.routeDistanceKm === 'number' ? b.routeDistanceKm : Number.MAX_SAFE_INTEGER;

        if (distA !== distB) return distA - distB;

        const seqA = a.routeSequence ?? Number.MAX_SAFE_INTEGER;
        const seqB = b.routeSequence ?? Number.MAX_SAFE_INTEGER;
        return seqA - seqB;
      });

      setDeliveries(sortedDeliveries);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load your deliveries.');
      setDeliveries([]);
    } finally {
      setLoadingDeliveries(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  useEffect(() => {
    if (!socket || !user?._id) return;

    const refresh = () => fetchDeliveries();
    socket.on('route_updated', refresh);
    socket.on('order_status_changed', refresh);

    return () => {
      socket.off('route_updated', refresh);
      socket.off('order_status_changed', refresh);
    };
  }, [socket, user?._id, fetchDeliveries]);

  const getShopName = (delivery) => delivery.shopName || delivery.shop?.name || delivery.businessName || delivery.location || 'Shop';

  // ── Display-only sort + search — never touches the real route order used
  // for navigation/locking, which is set entirely by the backend.
  const sortedForDisplay = useMemo(() => {
    const list = [...deliveries];
    if (sortBy === 'shop') {
      list.sort((a, b) => getShopName(a).localeCompare(getShopName(b)));
    } else if (sortBy === 'recent') {
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    }
    // 'distance' — leave as-is; fetchDeliveries already sorted this by route order
    return list;
  }, [deliveries, sortBy]);

  const displayDeliveries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedForDisplay;
    return sortedForDisplay.filter((d) => {
      const haystack = `${getShopName(d)} ${d.customerName || ''} ${d.location || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [sortedForDisplay, searchQuery]);

  const hasDistanceData = deliveries.some((d) => typeof d.routeDistanceKm === 'number');
  const hasDurationData = deliveries.some((d) => typeof d.routeDurationMin === 'number');
  const totalDistanceKm  = deliveries.reduce((sum, d) => sum + (d.routeDistanceKm || 0), 0);
  const totalDurationMin = deliveries.reduce((sum, d) => sum + (d.routeDurationMin || 0), 0);

  // Position (1-based) of the currently unlocked stop, in real route order —
  // every locked card points here since the backend unlocks one at a time.
  const currentStopNumber = useMemo(() => {
    const idx = deliveries.findIndex((d) => !d.deliveryLocked && d.status !== 'Delivered');
    return idx === -1 ? null : idx + 1;
  }, [deliveries]);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleNavigate = (delivery) => {
    if (!delivery.coordinates?.lat || !delivery.coordinates?.lng) return;
    window.open(`https://www.google.com/maps?q=${delivery.coordinates.lat},${delivery.coordinates.lng}`, '_blank');
  };

  const handleStartDelivery = async (delivery) => {
    setActionError('');
    setStartingId(delivery._id);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${delivery._id}/start-delivery`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.message || 'Could not start this delivery.');
        return;
      }
      navigate(`/delivery-details/${delivery._id}`);
    } catch {
      setActionError('Network error — please try again.');
    } finally {
      setStartingId(null);
    }
  };

  // ── Map view ───────────────────────────────────────────────────────────
  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    if (view !== 'map') return;

    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !L || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = L.map(mapContainerRef.current).setView([-0.3031, 36.0800], 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
          }).addTo(mapInstanceRef.current);
        }

        const map = mapInstanceRef.current;

        const layersToRemove = [];
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker || layer instanceof L.Polyline) layersToRemove.push(layer);
        });
        layersToRemove.forEach((l) => map.removeLayer(l));

        const points = deliveries
          .filter((d) => d.coordinates?.lat && d.coordinates?.lng)
          .map((d, i) => ({ d, i, latlng: [d.coordinates.lat, d.coordinates.lng] }));

        if (points.length === 0) { setMapError(''); return; }

        points.forEach(({ d, i, latlng }) => {
          const icon = L.divIcon({
            className: '',
            html: `<div style="background:${GREEN};color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);">${i + 1}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          L.marker(latlng, { icon })
            .addTo(map)
            .bindPopup(`<b>${getShopName(d)}</b><br/>${d.customerName || ''}`);
        });

        L.polyline(points.map((p) => p.latlng), { color: GREEN, weight: 3, opacity: 0.6, dashArray: '6 6' }).addTo(map);
        map.fitBounds(points.map((p) => p.latlng), { padding: [30, 30] });
        setMapError('');
      })
      .catch(() => setMapError('Could not load the map. Check your connection and try again.'));

    return () => { cancelled = true; };
  }, [view, deliveries]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', minHeight: '100vh', background: BG, paddingBottom: 60, fontFamily: "'Poppins','Segoe UI',sans-serif", color: INK, boxSizing: 'border-box' }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes cv-pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
        .cv-skel { background: #e2e8f0; animation: cv-pulse 1.4s ease-in-out infinite; }
        .cv-btn-nav:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
        .cv-btn-start:hover:not(:disabled) { filter: brightness(1.08); }
        .cv-pill:hover { border-color: ${GREEN}; }
        .cv-toggle:hover { color: ${GREEN}; }
        input::placeholder { color: #94a3b8; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '14px 16px' }}>
        <button
          onClick={() => navigate('/driver-dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 8 }}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>📦 My Deliveries</h2>
          <span style={{ background: '#dcfce7', color: GREEN, fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
            {deliveries.length} {deliveries.length === 1 ? 'Delivery' : 'Deliveries'} Today
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 12, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
          {[['list', 'List'], ['map', 'Map']].map(([key, label]) => (
            <button
              key={key}
              className="cv-toggle"
              onClick={() => setView(key)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: view === key ? '#fff' : 'transparent',
                color: view === key ? GREEN : MUTED,
                fontWeight: 700, fontSize: 13,
                boxShadow: view === key ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12.5, padding: '10px 12px', borderRadius: 10, marginBottom: 12 }}>
            {error}
          </div>
        )}
        {actionError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12.5, padding: '10px 12px', borderRadius: 10, marginBottom: 12 }}>
            {actionError}
          </div>
        )}

        {/* ── Route summary ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: '12px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 6 }}>Optimized Route</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 13.5, fontWeight: 700 }}>
            <span>🚚 {loadingDeliveries ? '—' : `${deliveries.length} Stops`}</span>
            <span style={{ color: GREEN }}>
              📍 {loadingDeliveries ? '—' : hasDistanceData ? `Total Route: ${totalDistanceKm.toFixed(1)} km` : 'Calculating route...'}
            </span>
            {!loadingDeliveries && hasDurationData && (
              <span style={{ color: MUTED }}>🕒 ETA: {formatDuration(totalDurationMin)}</span>
            )}
          </div>
        </div>

        {/* ── Sort control ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, overflowX: 'auto' }}>
          <span style={{ fontSize: 12, color: MUTED, fontWeight: 600, flexShrink: 0 }}>Sort by</span>
          {[
            ['distance', '📍 Distance'],
            ['shop', '🏪 Shop'],
            ['recent', '🕒 Recently Assigned'],
          ].map(([key, label]) => (
            <button
              key={key}
              className="cv-pill"
              onClick={() => setSortBy(key)}
              style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${sortBy === key ? GREEN : BORDER}`,
                background: sortBy === key ? '#f0fdf4' : '#fff',
                color: sortBy === key ? GREEN : MUTED,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Search ── */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customer, shop or location..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`,
            fontSize: 13, marginBottom: 12, outline: 'none', fontFamily: 'inherit', background: '#fff', color: INK,
          }}
        />

        {/* ── List view ── */}
        {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadingDeliveries ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : displayDeliveries.length === 0 && deliveries.length === 0 ? (
              <div style={{ background: '#fff', padding: '36px 20px', borderRadius: 14, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 4 }}>No deliveries assigned.</div>
                <div style={{ fontSize: 12.5, color: MUTED }}>You'll see new deliveries here when the admin assigns them.</div>
              </div>
            ) : displayDeliveries.length === 0 ? (
              <div style={{ background: '#fff', padding: 18, borderRadius: 14, border: `1px solid ${BORDER}`, fontSize: 13.5, color: MUTED, textAlign: 'center' }}>
                No deliveries match your search.
              </div>
            ) : (
              displayDeliveries.map((delivery) => {
                const routeIndex   = deliveries.findIndex((d) => d._id === delivery._id);
                const distanceText = typeof delivery.routeDistanceKm === 'number' ? `${delivery.routeDistanceKm.toFixed(1)} km` : 'Calculating...';
                const paymentMeta  = getPaymentMeta(delivery.paymentStatus);
                const statusMeta   = getStatusMeta(delivery.status);
                const locked       = !!delivery.deliveryLocked;
                const isDelivered  = delivery.status === 'Delivered';

                return (
                  <div key={delivery._id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 14 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', background: GREEN, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12,
                        flexShrink: 0, marginTop: 1,
                      }}>
                        {routeIndex + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15.5, fontWeight: 800, color: INK, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          🏪 {getShopName(delivery)}
                        </div>
                        <div style={{ fontSize: 12, color: MUTED, marginBottom: 1 }}>
                          👤 {delivery.customerName || '—'}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 8 }}>
                          📍 {shortenLocation(delivery.location)} &nbsp;·&nbsp; <span style={{ fontWeight: 700, color: INK }}>📏 {distanceText}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ background: paymentMeta.bg, color: paymentMeta.color, fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>
                            {paymentMeta.dot} {paymentMeta.label}
                          </span>
                          <span style={{ background: statusMeta.bg, color: statusMeta.color, fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>
                            {statusMeta.dot} {statusMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                      <button
                        className="cv-btn-nav"
                        onClick={() => handleNavigate(delivery)}
                        disabled={!delivery.coordinates?.lat}
                        style={{
                          padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 12.5,
                          cursor: delivery.coordinates?.lat ? 'pointer' : 'not-allowed',
                          background: '#fff', color: INK, border: `1px solid ${BORDER}`,
                        }}
                      >
                        🧭 Navigate
                      </button>
                      <button
                        className="cv-btn-start"
                        onClick={() => handleStartDelivery(delivery)}
                        disabled={locked || isDelivered || startingId === delivery._id}
                        style={{
                          padding: '10px 4px', borderRadius: 10, fontWeight: 700, fontSize: locked ? 11 : 12.5,
                          cursor: (locked || isDelivered) ? 'not-allowed' : 'pointer',
                          background: (locked || isDelivered) ? '#f1f5f9' : GREEN,
                          color: (locked || isDelivered) ? '#94a3b8' : '#fff',
                          border: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                      >
                        {startingId === delivery._id
                          ? 'Starting…'
                          : isDelivered
                            ? '✓ Delivered'
                            : locked
                              ? (currentStopNumber ? `🔒 Available after Stop #${currentStopNumber}` : '🔒 Locked')
                              : '▶ Start Delivery'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Map view ── */}
        {view === 'map' && (
          <div style={{ marginBottom: 16 }}>
            {mapError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12.5, padding: '10px 12px', borderRadius: 10, marginBottom: 10 }}>
                {mapError}
              </div>
            )}
            <div
              ref={mapContainerRef}
              style={{ width: '100%', height: 420, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}
            />
          </div>
        )}

      </div>
      <DriverBottomNav />
    </div>
  );
};

export default MyDeliveries;