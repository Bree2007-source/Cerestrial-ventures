import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import API_BASE_URL from '../config';
import useSocket from '../hooks/useSocket';

const GREEN = '#15803d';

// Default Leaflet marker icons don't load correctly under bundlers like Vite
// unless explicitly re-pointed — this mirrors the same fix LocationPicker uses.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = (status) => new L.DivIcon({
  className: '',
  html: `<div style="
    background: ${status === 'On Delivery' ? '#ea580c' : GREEN};
    width: 30px; height: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    font-size: 15px;
  ">🛵</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token');

export default function AdminLiveMap() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket({ joinAdmin: true });

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/drivers`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDrivers(Array.isArray(data) ? data : []);
    } catch {
      /* silent — map just shows what it already has */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  // Live location updates pushed from the server
  useEffect(() => {
    const onLocation = ({ driverId, lat, lng, address, status }) => {
      setDrivers((prev) => prev.map((d) =>
        d._id === driverId
          ? { ...d, currentLocation: { lat, lng, address }, status: status || d.status }
          : d
      ));
    };

    const onDriverStatus = ({ driverId, status, currentOrder }) => {
      setDrivers((prev) => prev.map((d) =>
        d._id === driverId ? { ...d, status, currentOrder } : d
      ));
    };

    socket.on('driver_location_update', onLocation);
    socket.on('driver_status_changed', onDriverStatus);

    return () => {
      socket.off('driver_location_update', onLocation);
      socket.off('driver_status_changed', onDriverStatus);
    };
  }, [socket]);

  const located = drivers.filter((d) => d.currentLocation?.lat && d.currentLocation?.lng);

  // Default center: Nairobi CBD, used until at least one driver reports a location
  const center = located.length
    ? [located[0].currentLocation.lat, located[0].currentLocation.lng]
    : [-1.286389, 36.817223];

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontFamily: 'sans-serif' }}>
        Loading live map…
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 14, color: '#1e293b' }}>📍 Live Driver Tracking</strong>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {located.length} of {drivers.length} drivers reporting location
        </span>
      </div>

      {located.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontFamily: 'sans-serif', fontSize: 13 }}>
          No drivers have reported a GPS location yet.
        </div>
      ) : (
        <MapContainer center={center} zoom={12} style={{ height: 360, width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {located.map((d) => (
            <Marker
              key={d._id}
              position={[d.currentLocation.lat, d.currentLocation.lng]}
              icon={driverIcon(d.status)}
            >
              <Popup>
                <div style={{ fontFamily: 'sans-serif', fontSize: 13 }}>
                  <strong>{d.name}</strong><br />
                  {d.phone}<br />
                  Status: <strong>{d.status}</strong><br />
                  {d.currentOrder && <>Order: #{(d.currentOrder._id || d.currentOrder).toString().slice(-6).toUpperCase()}<br /></>}
                  {d.currentLocation.address && <span style={{ color: '#64748b' }}>{d.currentLocation.address}</span>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}