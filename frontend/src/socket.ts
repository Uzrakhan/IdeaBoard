import { io } from 'socket.io-client';

// Use relative path for production, absolute for development
const BACKEND_URL = import.meta.env.PROD 
  ? ''  // Empty for production (uses same domain)
  : import.meta.env.VITE_BACKEND_URL; // Use env var for dev

// Verify URL is set
if (!BACKEND_URL) {
  console.error("VITE_BACKEND_URL is not defined!");
}

export const socket = io(BACKEND_URL, {
  withCredentials: true,
  autoConnect: true,
  transports: ['websocket'],
  path: "/socket.io/", // Explicit path
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});