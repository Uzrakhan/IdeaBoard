import { io } from 'socket.io-client';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

console.log('FRONTEND DEBUG: VITE_BACKEND_URL used for Socket.IO:', backendUrl); // ADD THIS LOG


export const socket = io(backendUrl, {
  withCredentials: true,
  autoConnect: false,
  transports: ['websocket', 'polling'],
  path: "/socket.io/", // Explicit path
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});