import { io } from 'socket.io-client'
import { API_HOST } from './config'

// Connect to your backend — derived from the same API_BASE_URL as every
// other request (see config.js), so socket and REST calls always target
// the same backend instead of silently drifting apart.
const BACKEND_URL = API_HOST

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