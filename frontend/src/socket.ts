import { io } from 'socket.io-client';

// Automatically detect backend URL from env or fallback to localhost
const backendUrl = import.meta.env.VITE_BACKEND_URL?.trim() || 'http://localhost:5000';

// ✅ Debug log to verify what’s being used
console.log('FRONTEND DEBUG: VITE_BACKEND_URL used for Socket.IO:', backendUrl);

export const socket = io(backendUrl, {
  withCredentials: true,
  autoConnect: false,             // Good for manual connection control
  transports: ['websocket', 'polling'],
  path: '/socket.io/',            // Keep this consistent with your backend setup
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
