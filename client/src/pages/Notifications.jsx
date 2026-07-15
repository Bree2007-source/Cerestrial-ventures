import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import API_BASE_URL from '../config'
import useSocket from '../hooks/useSocket'
import DriverBottomNav from '../components/DriverBottomNav'

const FONT  = "'Poppins', 'Segoe UI', sans-serif"
const GREEN = '#15803d'
const getToken = () => localStorage.getItem('cv-token') || localStorage.getItem('token')

const TYPE_ICONS = {
  order_placed: '🛒', order_status: '📦', payment: '💳',
  low_stock: '⚠️', driver_alert: '🚗', general: '🔔',
}

function timeAgo(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const Notifications = () => {
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const { addToast } = useNotifications()
  const driverId     = user?._id
  const socket       = useSocket({ joinDriver: driverId })

  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  const fetchNotifications = useCallback(async () => {
    if (!driverId) return
    try {
      const res  = await fetch(`${API_BASE_URL}/drivers/${driverId}/notifications`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = res.ok ? await res.json() : []
      setItems(Array.isArray(data) ? data : [])
    } catch { /* keep previous list */ }
    finally { setLoading(false) }
  }, [driverId])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // Real-time socket
  useEffect(() => {
    if (!socket || !driverId) return

    const handleNew = (notification) => {
      setItems(prev => {
        if (prev.some(n => n._id === notification._id)) return prev
        return [{ ...notification, read: false }, ...prev]
      })
      addToast(
        `${TYPE_ICONS[notification.type] || '🔔'} ${notification.title}: ${notification.message}`,
        'info'
      )
    }

    socket.on('new_notification',    handleNew)
    socket.on('order_assigned',      fetchNotifications)
    socket.on('driver_notification', fetchNotifications)

    return () => {
      socket.off('new_notification',    handleNew)
      socket.off('order_assigned',      fetchNotifications)
      socket.off('driver_notification', fetchNotifications)
    }
  }, [socket, driverId, fetchNotifications, addToast])

  const handleTap = async (n) => {
    if (!n.read) {
      setItems(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x))
      fetch(`${API_BASE_URL}/drivers/${driverId}/notifications/${n._id}/read`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` },
      }).catch(() => {})
    }
    if (n.link) navigate(n.link)
  }

  const markAllRead = async () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    fetch(`${API_BASE_URL}/drivers/${driverId}/notifications/mark-all-read`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` },
    }).catch(() => {})
  }

  const displayed   = filter === 'unread' ? items.filter(n => !n.read) : items
  const unreadCount = items.filter(n => !n.read).length

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8fafc', paddingBottom: 96, fontFamily: FONT }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #166534 100%)`, padding: '18px 18px 20px', color: '#fff' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: 0.9, marginBottom: 4 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Notifications</div>
            {unreadCount > 0 && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{unreadCount} unread</div>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 20, padding: '6px 14px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Mark all read
            </button>
          )}
        </div>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {['all', 'unread'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? '#fff' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, padding: '5px 14px', color: filter === f ? GREEN : '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : displayed.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
            <div style={{ fontWeight: 800, color: '#334155' }}>{filter === 'unread' ? 'No unread notifications' : "You're all caught up"}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>New assignments and updates will appear here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayed.map(n => (
              <div key={n._id} onClick={() => handleTap(n)} style={{ background: '#fff', borderRadius: 14, padding: 14, cursor: 'pointer', boxShadow: n.read ? '0 2px 8px rgba(0,0,0,0.04)' : '0 6px 18px rgba(21,128,61,0.10)', border: n.read ? '1px solid #f1f5f9' : '1.5px solid #bbf7d0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: n.read ? '#f8fafc' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {TYPE_ICONS[n.type] || '🔔'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: n.read ? 600 : 800, fontSize: 13.5, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {n.title}
                    {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3, lineHeight: 1.45 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 6, fontWeight: 600 }}>{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DriverBottomNav />
    </div>
  )
}

export default Notifications