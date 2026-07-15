import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API_BASE_URL from '../config'

const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token')

const NAV_ITEMS = [
  { key: 'home',          label: 'Home',       icon: '🏠', path: '/driver-dashboard' },
  { key: 'deliveries',    label: 'Deliveries', icon: '📦', path: '/driver-deliveries' },
  { key: 'map',           label: 'Map',        icon: '🗺️', path: '/delivery-map' },
  { key: 'notifications', label: 'Alerts',     icon: '🔔', path: '/driver-notifications', hasBadge: true },
  { key: 'profile',       label: 'Profile',    icon: '👤', path: '/driver-profile' },
]

const DriverBottomNav = () => {
  const navigate      = useNavigate()
  const location      = useLocation()
  const { user }      = useAuth()
  const [unread, setUnread] = useState(0)

  const fetchUnread = useCallback(async () => {
    if (!user?._id) return
    try {
      const res = await fetch(
        `${API_BASE_URL}/drivers/${user._id}/notifications/unread-count`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      if (res.ok) {
        const data = await res.json()
        setUnread(data.count || 0)
      }
    } catch { /* non-fatal */ }
  }, [user?._id])

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30_000)
    return () => clearInterval(interval)
  }, [fetchUnread])

  // Clear badge when driver opens the notifications page
  useEffect(() => {
    if (location.pathname === '/driver-notifications') setUnread(0)
  }, [location.pathname])

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999999,
      background: '#fff', borderTop: '2px solid #15803d',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.10)',
      display: 'flex', justifyContent: 'space-around',
      padding: '8px 4px calc(8px + env(safe-area-inset-bottom))',
      fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    }}>
      {NAV_ITEMS.map(item => {
        const active = location.pathname === item.path
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3,
              background: active ? 'rgba(21,128,61,0.10)' : 'none',
              border: 'none', cursor: 'pointer',
              padding: '4px 12px', borderRadius: 12,
              color: active ? '#15803d' : '#94a3b8',
              position: 'relative', transition: 'all 0.18s',
            }}
          >
            <span style={{ fontSize: 20, position: 'relative' }}>
              {item.icon}
              {item.hasBadge && unread > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -8,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: '#ef4444', color: '#fff',
                  fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', border: '2px solid #fff',
                }}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600 }}>
              {item.label}
            </span>
            {active && (
              <div style={{
                position: 'absolute', bottom: 2, left: '50%',
                transform: 'translateX(-50%)',
                width: 4, height: 4, borderRadius: 2, background: '#15803d',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default DriverBottomNav