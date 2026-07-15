import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import API_BASE_URL from '../config'
import { useAuth } from './AuthContext'

const NotificationContext = createContext()
let toastIdCounter = 0

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth()

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(false)
  const [toasts, setToasts]               = useState([])
  const toastTimers = useRef({})

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('cv-token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  // ── Toast API ──────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdCounter
    setToasts(prev => [...prev, { id, message, type, visible: true }])
    toastTimers.current[id] = setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t))
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
        delete toastTimers.current[id]
      }, 400)
    }, duration)
  }, [])

  const dismissToast = useCallback((id) => {
    clearTimeout(toastTimers.current[id])
    delete toastTimers.current[id]
    setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400)
  }, [])

  useEffect(() => {
    return () => { Object.values(toastTimers.current).forEach(clearTimeout) }
  }, [])

  // ── DB notifications ───────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user || user.role === 'driver') {
      setNotifications([])
      setUnreadCount(0)
      return
    }
    setLoading(true)
    try {
      const res  = await axios.get(`${API_BASE_URL}/notifications`, { headers: getHeaders() })
      const data = Array.isArray(res.data) ? res.data : []
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.read).length)
    } catch (err) {
      console.warn('[NotificationContext] fetch:', err.message)
    } finally {
      setLoading(false)
    }
  }, [user, getHeaders])

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {},
        { headers: getHeaders() }
      )
      setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.warn('[NotificationContext] markAsRead:', err.message)
    }
  }, [getHeaders])

  const markAllAsRead = useCallback(async () => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/mark-all-read`, {}, { headers: getHeaders() })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.warn('[NotificationContext] markAllAsRead:', err.message)
    }
  }, [getHeaders])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  useEffect(() => {
    if (!user || user.role === 'driver') return
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [user, fetchNotifications])

  // ── Real-time socket listener ──────────────────────────────────────────────
  useEffect(() => {
    if (!user || user.role === 'driver') return

    let cleanup = () => {}

    import('../socket.js').then(({ default: socket }) => {
      const joinRooms = () => {
        if (user.isAdmin) socket.emit('join_admin')
      }
      if (socket.connected) joinRooms()
      socket.on('connect', joinRooms)

      const handleNew = (notification) => {
        setNotifications(prev => {
          if (prev.some(n => n._id === notification._id)) return prev
          return [notification, ...prev]
        })
        setUnreadCount(prev => prev + 1)

        const icon = notification.icon || '🔔'
        addToast(
          `${icon} ${notification.title}: ${notification.message}`,
          notification.type === 'low_stock'    ? 'error'   :
          notification.type === 'payment'      ? 'success' :
          notification.type === 'order_placed' ? 'success' : 'info'
        )
      }

      socket.on('new_notification', handleNew)

      cleanup = () => {
        socket.off('connect', joinRooms)
        socket.off('new_notification', handleNew)
      }
    })

    return () => cleanup()
  }, [user, addToast])

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading,
      fetchNotifications, markAsRead, markAllAsRead,
      addToast, dismissToast, toasts,
    }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  )
}

// ── Toast renderer ────────────────────────────────────────────────────────────
const TOAST_COLORS = {
  success: { bg: '#0f3d1a', border: '#1d6b2a', icon: '✅' },
  error:   { bg: '#3a0f0f', border: '#7a2020', icon: '❌' },
  info:    { bg: '#1a2a4a', border: '#2a4a8a', icon: 'ℹ️' },
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div style={{
      position: 'fixed', top: 80, right: 16, zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none', maxWidth: 340, width: 'calc(100vw - 32px)',
    }}>
      {toasts.map(toast => {
        const s = TOAST_COLORS[toast.type] || TOAST_COLORS.info
        return (
          <div
            key={toast.id}
            onClick={() => onDismiss(toast.id)}
            style={{
              pointerEvents: 'all',
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              opacity:   toast.visible ? 1 : 0,
              transform: toast.visible ? 'translateX(0)' : 'translateX(24px)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
              color: '#e0f0e4', fontSize: 14, lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
            <span style={{ flex: 1 }}>{toast.message}</span>
            <span style={{ fontSize: 18, opacity: 0.5, flexShrink: 0 }}>×</span>
          </div>
        )
      })}
    </div>
  )
}

export const useNotifications = () => useContext(NotificationContext)
export default NotificationContext