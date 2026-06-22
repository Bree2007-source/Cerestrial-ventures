import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import API_BASE_URL from '../config'
import { useAuth } from './AuthContext'

const NotificationContext = createContext()

// ─── Toast queue (UI pop-ups, separate from DB notifications) ────────────────
// Usage anywhere in the app:
//   const { addToast } = useNotifications()
//   addToast('Order placed!', 'success')   // type: 'success' | 'error' | 'info'
// ─────────────────────────────────────────────────────────────────────────────

let toastIdCounter = 0

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth()

  // ── DB notifications (bell icon) ──────────────────────────────────────────
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // ── Toast queue (UI pop-ups) ──────────────────────────────────────────────
  // Each toast: { id, message, type, visible }
  const [toasts, setToasts] = useState([])
  const toastTimers = useRef({})

  const getHeaders = () => {
    const token = localStorage.getItem('cv-token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // ── Add a toast (UI notification pop-up) ─────────────────────────────────
  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastIdCounter

    setToasts(prev => [...prev, { id, message, type, visible: true }])

    // Start fade-out shortly before removal
    toastTimers.current[id] = setTimeout(() => {
      setToasts(prev =>
        prev.map(t => t.id === id ? { ...t, visible: false } : t)
      )
      // Remove from DOM after fade animation
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(toastTimers.current).forEach(clearTimeout)
    }
  }, [])

  // ── DB notifications ──────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      return
    }
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: getHeaders(),
      })
      const data = Array.isArray(res.data) ? res.data : []
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.read).length)
    } catch (err) {
      console.warn('Could not load notifications:', err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {},
        { headers: getHeaders() }
      )
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.warn('Could not mark notification as read:', err.message)
    }
  }

  const markAllAsRead = async () => {
    try {
      await axios.patch(
        `${API_BASE_URL}/notifications/mark-all-read`,
        {},
        { headers: getHeaders() }
      )
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.warn('Could not mark all as read:', err.message)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Poll every 30 seconds
  useEffect(() => {
    if (!user) return
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [user, fetchNotifications])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      // toast API
      addToast,
      dismissToast,
      toasts,
    }}>
      {children}

      {/* ── Toast renderer — lives here so it's always on top ── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  )
}

// ── Toast Container ───────────────────────────────────────────────────────────
const TOAST_COLORS = {
  success: { bg: '#0f3d1a', border: '#1d6b2a', icon: '✅' },
  error:   { bg: '#3a0f0f', border: '#7a2020', icon: '❌' },
  info:    { bg: '#1a2a4a', border: '#2a4a8a', icon: 'ℹ️' },
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 80,           // below navbar
      right: 16,
      zIndex: 99999,     // always on top
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      pointerEvents: 'none',
      maxWidth: 340,
      width: 'calc(100vw - 32px)',
    }}>
      {toasts.map(toast => {
        const style = TOAST_COLORS[toast.type] || TOAST_COLORS.info
        return (
          <div
            key={toast.id}
            onClick={() => onDismiss(toast.id)}
            style={{
              pointerEvents: 'all',
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              // Fade + slide animation
              opacity: toast.visible ? 1 : 0,
              transform: toast.visible ? 'translateX(0)' : 'translateX(24px)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
              color: '#e0f0e4',
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{style.icon}</span>
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