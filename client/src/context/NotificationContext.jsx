import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import API_BASE_URL from '../config'
import { useAuth } from './AuthContext'

const NotificationContext = createContext()

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const getHeaders = () => {
    const token = localStorage.getItem('cv-token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

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

  // Refresh notifications every 30 seconds
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
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
export default NotificationContext