import { io } from 'socket.io-client';

export const socket = io('https://ideaboard-backend.onrender.com', {
  withCredentials: true,
  autoConnect: true,
  transports: ['websocket', 'polling'] 
});