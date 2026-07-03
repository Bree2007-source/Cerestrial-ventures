import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

const Checkout = () => {
  const { cartItems, clearCart } = useCart();
  const navigate = useNavigate();

  const [customerName, setCustomerName]       = useState('');
  const [phone, setPhone]                     = useState('');
  const [userId, setUserId]                   = useState(null);
  const [location, setLocation]               = useState('');
  const [loading, setLoading]                 = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [deliveryTime, setDeliveryTime]       = useState('Today');
  const [paymentMethod, setPaymentMethod]     = useState('M-Pesa');
  const [mapVisible, setMapVisible]           = useState(false);
  const [pinnedLatLng, setPinnedLatLng]       = useState(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locationSource, setLocationSource]   = useState(''); // 'saved' | 'fresh' | 'manual' | 'previous'

  // ── Previous order pre-fill states ──────────────────────────
  const [previousOrder, setPreviousOrder]     = useState(null);
  const [showPreviousOption, setShowPreviousOption] = useState(false);

  const mapInitialized  = useRef(false);
  const markerRef       = useRef(null);
  const mapInstanceRef  = useRef(null);
  const pinnedLatLngRef = useRef(null);

  // ── On mount: load user info + try saved location first ───────────
  useEffect(() => {
    // Load user profile
    const raw = localStorage.getItem('cv-user') || localStorage.getItem('user');
    try {
      const user = raw ? JSON.parse(raw) : null;
      if (user) {
        if (user.name || user.fullName) setCustomerName(user.name || user.fullName);
        if (user.phone) setPhone(user.phone);
        if (user._id)   setUserId(user._id);
      }
    } catch {}

    // Fetch previous order for pre-fill suggestion
    const fetchPreviousOrder = async () => {
      try {
        const token = localStorage.getItem('cv-token') || localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/orders/my`, {
          headers: { 
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        if (res.ok) {
          const orders = await res.json();
          if (orders && orders.length > 0) {
            const lastOrder = orders[0]; // Most recent (sorted by createdAt desc)
            setPreviousOrder(lastOrder);
            setShowPreviousOption(true);
          }
        }
      } catch (err) {
        console.error('Error fetching previous order:', err);
      }
    };

    fetchPreviousOrder();

    // Try saved location from login first (instant, no permission prompt needed)
    const savedLocation = localStorage.getItem('cv-location');
    if (savedLocation) {
      try {
        const { lat, lng, address } = JSON.parse(savedLocation);
        if (lat && lng && address) {
          setPinnedLatLng({ lat, lng });
          pinnedLatLngRef.current = { lat, lng };
          setLocation(address);
          setLocationConfirmed(true);
          setLocationSource('saved');
          return; // done — no need to call GPS again
        }
      } catch {}
    }

    // No saved location — silently try GPS
    autoDetectLocation('fresh');
  }, []);

  // ── Use previous order location ────────────────────────────
  const usePreviousLocation = () => {
    if (!previousOrder) return;
    
    // Fill in all fields from previous order
    setCustomerName(previousOrder.customerName);
    setPhone(previousOrder.phone);
    setLocation(previousOrder.location);
    
    if (previousOrder.coordinates?.lat && previousOrder.coordinates?.lng) {
      setPinnedLatLng(previousOrder.coordinates);
      pinnedLatLngRef.current = previousOrder.coordinates;
      setLocationConfirmed(true);
      setLocationSource('previous');
    }
    
    // Hide the suggestion after they choose
    setShowPreviousOption(false);
  };

  // ── Use different location (hide suggestion) ────────────────
  const useNewLocation = () => {
    setShowPreviousOption(false);
    // User will enter new data manually
  };

  useEffect(() => {
    pinnedLatLngRef.current = pinnedLatLng;
  }, [pinnedLatLng]);

  // ── GPS detection ─────────────────────────────────────────────────
  const autoDetectLocation = (source = 'fresh') => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await reverseGeocode(lat, lng);
        setPinnedLatLng({ lat, lng });
        pinnedLatLngRef.current = { lat, lng };
        setLocation(address);
        setLocationConfirmed(true);
        setLocationSource(source);
        // Also update the saved location in localStorage
        localStorage.setItem('cv-location', JSON.stringify({ lat, lng, address }));
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        // Silent fail — user can manually pick
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Reverse geocode ───────────────────────────────────────────────
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  // ── Map initialization ────────────────────────────────────────────
  useEffect(() => {
    if (!mapVisible) return;
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (mapInitialized.current) return;
      const L = window.L;
      if (!L) return;
      mapInitialized.current = true;

      // Default to Nakuru if no location yet
      const startPos = pinnedLatLng || { lat: -0.3031, lng: 36.0800 };
      const map = L.map('checkout-map').setView([startPos.lat, startPos.lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      mapInstanceRef.current = map;

      // Show existing pin if location already confirmed
      if (pinnedLatLng) {
        const marker = L.marker([pinnedLatLng.lat, pinnedLatLng.lng], { draggable: true }).addTo(map);
        marker.on('dragend', (ev) => {
          const pos = ev.target.getLatLng();
          setPinnedLatLng({ lat: pos.lat, lng: pos.lng });
        });
        markerRef.current = marker;
      }

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
          marker.on('dragend', (ev) => {
            const pos = ev.target.getLatLng();
            setPinnedLatLng({ lat: pos.lat, lng: pos.lng });
          });
          markerRef.current = marker;
        }
        setPinnedLatLng({ lat, lng });
      });
    };

    if (!window.L) {
      if (!document.getElementById('leaflet-js')) {
        const script    = document.createElement('script');
        script.id       = 'leaflet-js';
        script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload   = () => setTimeout(initMap, 100);
        document.head.appendChild(script);
      }
    } else {
      setTimeout(initMap, 100);
    }
  }, [mapVisible]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await reverseGeocode(lat, lng);
        setPinnedLatLng({ lat, lng });
        pinnedLatLngRef.current = { lat, lng };
        setLocation(address);
        setLocationConfirmed(true);
        setLocationSource('fresh');
        setMapVisible(false);
        localStorage.setItem('cv-location', JSON.stringify({ lat, lng, address }));
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        alert('Unable to get location. Please pin it on the map.');
      }
    );
  };

  const handleConfirmPin = async () => {
    const current = pinnedLatLngRef.current;
    if (!current) { alert('Please tap on the map to drop a pin first.'); return; }
    const address = await reverseGeocode(current.lat, current.lng);
    setLocation(address);
    setLocationConfirmed(true);
    setLocationSource('manual');
    localStorage.setItem('cv-location', JSON.stringify({ lat: current.lat, lng: current.lng, address }));
    setMapVisible(false);
  };

  const resetLocation = () => {
    setLocationConfirmed(false);
    setLocationSource('');
    setPinnedLatLng(null);
    setLocation('');
    mapInitialized.current = false;
    markerRef.current      = null;
    pinnedLatLngRef.current = null;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
  };

  const closeMap = () => {
    setMapVisible(false);
    mapInitialized.current = false;
    markerRef.current      = null;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
  };

  // ── Helpers ───────────────────────────────────────────────────────
  const formatPhone = (raw) => {
    let cleaned = raw.replace(/\s/g, '');
    if (cleaned.startsWith('0'))  return '254' + cleaned.slice(1);
    if (cleaned.startsWith('+'))  return cleaned.slice(1);
    return cleaned;
  };

  const getItemQuantity = (item) => Number(item.quantity || item.qty || 1);
  const getItemPrice    = (item) => Number(item.retailPrice || item.price || 0);

  const itemsToOrder = cartItems.map(item => ({
    name:     item.name,
    quantity: getItemQuantity(item),
    price:    getItemPrice(item),
  }));

  const totalAmount = itemsToOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ── Save order ────────────────────────────────────────────────────
  const saveOrder = async (extra = {}) => {
    const token  = localStorage.getItem('cv-token') || localStorage.getItem('token');
    const coords = pinnedLatLngRef.current;

    const response = await fetch(`${API_BASE_URL}/orders`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        customerName,
        phone:        formatPhone(phone),
        location,
        coordinates:  coords ? { lat: coords.lat, lng: coords.lng } : null,
        deliveryTime,
        totalAmount,
        paymentMethod,
        items:        itemsToOrder,
        userId:       userId || null,
        status:       'Pending',
        ...extra,
      }),
    });
    const data = await response.json();
    return { response, data };
  };

  // ── Submit (SIMPLIFIED - no STK push) ────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!customerName || !phone) {
      alert('Please fill in your name and phone number');
      setLoading(false);
      return;
    }
    if (!locationConfirmed || !pinnedLatLngRef.current) {
      alert('Please select your delivery location before placing your order.');
      setLoading(false);
      return;
    }
    if (cartItems.length === 0) {
      alert('Your cart is empty');
      setLoading(false);
      return;
    }

    const orderUrl = (orderId) => `/track-order?id=${orderId}`;

    try {
      // Both M-Pesa and Cash follow the same simple flow now
      const { response, data } = await saveOrder({ paymentMethod });
      if (response.ok) {
        clearCart();
        
        // Different success messages based on payment method
        const message = paymentMethod === 'Cash'
          ? '✅ Order placed! Pay cash on delivery.'
          : '✅ Order placed! Driver will request M-Pesa payment on delivery.';
        
        alert(message);
        navigate(orderUrl(data._id));
      } else {
        alert(data.message || '❌ Failed to save order. Please try again.');
      }
    } catch (err) {
      console.error('Order submission error:', err);
      alert('❌ Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // ── Empty cart ────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🛒</div>
        <h3>Your shopping cart is empty.</h3>
        <button onClick={() => navigate('/')}
          style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          ← Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ borderBottom: '3px solid #15803d', paddingBottom: '10px', color: '#1e293b' }}>
        🛡️ Complete Your Order
      </h2>

      {/* ── Previous Order Suggestion Banner ────────────────── */}
      {showPreviousOption && previousOrder && (
        <div style={{
          background: 'linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)',
          border: '2px solid #10b981',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 4px 12px rgba(16,185,129,0.1)',
        }}>
          <div style={{ fontSize: '28px', flexShrink: 0 }}>⚡</div>
          
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '15px', color: '#065f46', marginBottom: '4px' }}>
              Quick checkout: Use your previous location?
            </div>
            <div style={{ fontSize: '13px', color: '#047857', marginBottom: '10px' }}>
              📍 {previousOrder.location}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={usePreviousLocation}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.background = '#059669'}
                onMouseLeave={(e) => e.target.style.background = '#10b981'}
              >
                ✅ Use Same Location
              </button>
              <button
                type="button"
                onClick={useNewLocation}
                style={{
                  background: '#fff',
                  color: '#047857',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f0fdf4';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#fff';
                }}
              >
                ✏️ Use Different Location
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPreviousOption(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#047857',
              padding: '4px 8px',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', marginTop: '20px' }}>

        {/* ── LEFT: Form ── */}
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>Delivery Details</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Your Full Name *</label>
            <input type="text" value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              required placeholder="e.g., Brenda Kathure" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Phone Number *</label>
            <input type="tel" value={phone}
              onChange={e => setPhone(e.target.value)}
              required placeholder="e.g., 0712345678" style={inputStyle} />
            <small style={{ color: '#64748b', fontSize: '11px' }}>Used for delivery updates and payment collection</small>
          </div>

          {/* ── Delivery Location ── */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Delivery Location *</label>

            {/* Detecting spinner */}
            {locationLoading && (
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', fontSize: '13px', color: '#92400e', marginTop: '8px' }}>
                📡 Detecting your location...
              </div>
            )}

            {/* Not yet confirmed */}
            {!locationConfirmed && !locationLoading && (
              <>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button type="button" onClick={handleUseCurrentLocation}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid #15803d', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                    📍 Use Current Location
                  </button>
                  <button type="button" onClick={() => setMapVisible(true)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid #1d4ed8', backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                    🗺️ Pin on Map
                  </button>
                </div>
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
                  Please select your delivery location to continue.
                </p>
              </>
            )}

            {/* Confirmed location card */}
            {locationConfirmed && (
              <div style={{ marginTop: '8px', padding: '12px 14px', borderRadius: '8px', border: '2px solid #15803d', backgroundColor: '#f0fdf4' }}>
                {/* Source badge */}
                {locationSource === 'saved' && (
                  <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✅ Using your saved location
                  </div>
                )}
                {locationSource === 'previous' && (
                  <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginBottom: '6px' }}>
                    ⚡ Using your previous order location
                  </div>
                )}
                {locationSource === 'fresh' && (
                  <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 700, marginBottom: '6px' }}>
                    📡 Live GPS location
                  </div>
                )}
                {locationSource === 'manual' && (
                  <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 700, marginBottom: '6px' }}>
                    📌 Manually pinned location
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#166534', flex: 1 }}>📍 {location}</span>
                  <button type="button" onClick={resetLocation}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                    ✕ Change
                  </button>
                </div>

                {pinnedLatLng && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8' }}>
                    {pinnedLatLng.lat.toFixed(5)}, {pinnedLatLng.lng.toFixed(5)}
                  </div>
                )}

                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={handleUseCurrentLocation}
                    style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #15803d', backgroundColor: 'white', color: '#15803d', cursor: 'pointer', fontWeight: 600 }}>
                    🔄 Refresh GPS
                  </button>
                  <button type="button" onClick={() => setMapVisible(true)}
                    style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #1d4ed8', backgroundColor: 'white', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600 }}>
                    📌 Adjust on Map
                  </button>
                </div>
              </div>
            )}

            {/* Map modal */}
            {mapVisible && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '600px' }}>
                  <h3 style={{ marginTop: 0, color: '#1e293b' }}>📍 Pin Your Delivery Location</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                    Tap anywhere on the map to drop a pin, or drag the existing pin to adjust.
                  </p>
                  <div id="checkout-map" style={{ height: '350px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  {pinnedLatLng && (
                    <p style={{ fontSize: '12px', color: '#15803d', marginTop: '8px' }}>
                      ✅ Pin at {pinnedLatLng.lat.toFixed(5)}, {pinnedLatLng.lng.toFixed(5)}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button type="button" onClick={handleConfirmPin}
                      style={{ flex: 1, padding: '12px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                      ✅ Confirm This Location
                    </button>
                    <button type="button" onClick={closeMap}
                      style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Time */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Delivery Time</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              {['Today', 'Tomorrow'].map(option => (
                <button key={option} type="button" onClick={() => setDeliveryTime(option)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${deliveryTime === option ? '#15803d' : '#e2e8f0'}`, backgroundColor: deliveryTime === option ? '#dcfce7' : 'white', color: deliveryTime === option ? '#15803d' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                  {option === 'Today' ? '⚡ Today' : '📅 Tomorrow'}
                </button>
              ))}
            </div>
          </div>

          {/* ── SIMPLIFIED: Payment Method (just 2 simple options) ── */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Payment Method</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {[
                { id: 'M-Pesa', label: '📱 M-Pesa',           desc: 'Driver will request payment on delivery' },
                { id: 'Cash',   label: '💵 Cash on Delivery',  desc: 'Pay when goods arrive'   },
              ].map(method => (
                <div key={method.id} onClick={() => setPaymentMethod(method.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '10px', border: `2px solid ${paymentMethod === method.id ? '#15803d' : '#e2e8f0'}`, backgroundColor: paymentMethod === method.id ? '#dcfce7' : 'white', cursor: 'pointer' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${paymentMethod === method.id ? '#15803d' : '#cbd5e1'}`, backgroundColor: paymentMethod === method.id ? '#15803d' : 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {paymentMethod === method.id && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white' }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{method.label}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{method.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ backgroundColor: loading ? '#86efac' : '#15803d', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}>
            {loading ? '🔄 Processing...' : `✅ Place Order — KSh ${totalAmount.toLocaleString()}`}
          </button>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
            {paymentMethod === 'M-Pesa'
              ? '📱 Driver will request M-Pesa payment when delivering your order'
              : '🚚 Pay cash when your order is delivered'}
          </p>
        </form>

        {/* ── RIGHT: Order Summary ── */}
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>📋 Order Summary</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '20px' }}>
              {deliveryTime === 'Today' ? '⚡ Delivery Today' : '📅 Delivery Tomorrow'}
            </span>
            <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '12px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '20px' }}>
              {paymentMethod === 'M-Pesa' ? '📱 M-Pesa' : '💵 Cash'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '15px 0', maxHeight: '350px', overflowY: 'auto' }}>
            {cartItems.map((item, index) => (
              <div key={item._id || index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <strong>{item.name}</strong>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>
                    Qty: {item.qty || item.quantity || 1} × KSh {(item.retailPrice || item.price).toLocaleString()}
                  </span>
                </div>
                <strong style={{ color: '#15803d' }}>
                  KSh {((item.retailPrice || item.price) * (item.qty || item.quantity || 1)).toLocaleString()}
                </strong>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid #15803d', paddingTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Grand Total:</span>
              <strong style={{ fontSize: '26px', color: '#15803d' }}>KSh {totalAmount.toLocaleString()}</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: 'bold',
  marginBottom: '5px', color: '#334155',
};

const inputStyle = {
  width: '100%', padding: '10px', borderRadius: '6px',
  border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px',
};

export default Checkout;