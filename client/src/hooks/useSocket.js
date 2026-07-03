import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import API_BASE_URL from '../config';

// API_BASE_URL is typically something like https://api.cerestrial.com/api —
// strip a trailing /api so the socket connects to the bare server origin.
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let sharedSocket = null;

function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
    });
  }
  return sharedSocket;
}

/**
 * useSocket — connects once per app session and re-uses the same socket
 * across every component that calls this hook.
 *
 * @param {Object} opts
 * @param {boolean} [opts.joinAdmin]   - pass true to join the admin room
 * @param {string}  [opts.joinDriver]  - pass a driverId to join that driver's room
 * @param {string}  [opts.joinOrder]   - pass an orderId to track that order
 */
export default function useSocket({ joinAdmin, joinDriver, joinOrder } = {}) {
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const join = () => {
      if (joinAdmin) socket.emit('join_admin');
      if (joinDriver) socket.emit('join_driver', joinDriver);
      if (joinOrder) socket.emit('join_order', joinOrder);
    };

    if (socket.connected) join();
    socket.on('connect', join);

    return () => {
      socket.off('connect', join);
    };
  }, [joinAdmin, joinDriver, joinOrder]);

  return socketRef.current;
}