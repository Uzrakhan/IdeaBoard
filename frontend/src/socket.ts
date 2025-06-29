import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_BACKEND_URL, {
  withCredentials: true,
  autoConnect: false,
  transports: ['websocket'],
  path: "/socket.io/", // Explicit path
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});