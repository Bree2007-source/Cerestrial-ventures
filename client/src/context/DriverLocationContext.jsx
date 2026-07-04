import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import API_BASE_URL from '../config';

// ── Single shared driver GPS tracker ──────────────────────────────────────
// Replaces the old per-page `navigator.geolocation.watchPosition` calls
// (previously duplicated in DriverDashboard.jsx, DeliveryProgress.jsx).
// Mounted ONCE at the top of the app (in App.jsx, below AuthProvider —
// never inside a <Route>), so it survives navigation between every driver
// screen. It's a no-op for non-driver users.

const DriverLocationContext = createContext(null);

// Minimum movement (km) before a GPS fix is worth sending to the backend.
// Kept in the 50–100m range requested; raw GPS fixes still update local
// state every time so the live map marker stays smooth, but the network
// PATCH only fires once the driver has actually moved this far.
const SIGNIFICANT_MOVE_KM = 0.075; // ~75m

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function DriverLocationProvider({ children }) {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver' && !!user?._id;

  const [position, setPosition] = useState(null); // { lat, lng, accuracy, updatedAt }
  const [locationError, setLocationError] = useState('');
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef(null);
  const lastSentRef = useRef({ lat: null, lng: null });

  const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token');

  const sendLocation = useCallback(async (driverId, lat, lng) => {
    try {
      await fetch(`${API_BASE_URL}/drivers/${driverId}/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ lat, lng, address: '' }),
      });
      lastSentRef.current = { lat, lng };
    } catch {
      // Fire-and-forget, matching the previous DriverDashboard.jsx
      // behavior — the next GPS fix will just retry.
    }
  }, []);

  const startTracking = useCallback((driverId) => {
    if (!navigator.geolocation || watchIdRef.current !== null) return;
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocationError('');
        setPosition({ lat: latitude, lng: longitude, accuracy, updatedAt: Date.now() });

        const { lat: prevLat, lng: prevLng } = lastSentRef.current;
        const movedSignificantly =
          prevLat == null || distanceKm(prevLat, prevLng, latitude, longitude) >= SIGNIFICANT_MOVE_KM;

        if (movedSignificantly) sendLocation(driverId, latitude, longitude);
      },
      () => setLocationError('Location access is off — turn it on so customers and admin can see where you are.'),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }, [sendLocation]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Start once the driver logs in; stop on logout or role change.
  // "Browser closes" needs no explicit handling — watchPosition is killed
  // automatically when the tab/process dies, same as before.
  useEffect(() => {
    if (isDriver) {
      startTracking(user._id);
    } else {
      stopTracking();
      setPosition(null);
      lastSentRef.current = { lat: null, lng: null };
    }
    // Provider itself never unmounts (mounted once at app root), so this
    // cleanup only ever runs on an actual isDriver/user._id change.
    return () => stopTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriver, user?._id]);

  // Exposed for an explicit "Go Offline" control, wherever one gets added
  // (e.g. DriverProfile.jsx) — not wired to any UI yet since none exists
  // in the files reviewed so far.
  const goOffline = useCallback(() => stopTracking(), [stopTracking]);
  const goOnline = useCallback(() => {
    if (isDriver) startTracking(user._id);
  }, [isDriver, user?._id, startTracking]);

  return (
    <DriverLocationContext.Provider value={{ position, locationError, isTracking, goOffline, goOnline }}>
      {children}
    </DriverLocationContext.Provider>
  );
}

export const useDriverLocation = () => useContext(DriverLocationContext);