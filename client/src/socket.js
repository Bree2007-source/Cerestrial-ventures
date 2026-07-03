import { io } from 'socket.io-client'

// Connect to your backend
const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '')
  || 'http://localhost:5000'

const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
})

socket.on('connect', () => {
  console.log('🟢 Socket connected:', socket.id)
})

socket.on('disconnect', () => {
  console.log('🔴 Socket disconnected')
})

socket.on('connect_error', (err) => {
  console.log('⚠️ Socket connection error:', err.message)
})

export default socket