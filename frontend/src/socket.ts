import { io } from 'socket.io-client';

/*
export const socket = io('http://localhost:5000', {
    withCredentials: true,
    autoConnect: true
});
*/


export const socket = io({
  path: '/socket.io',
  withCredentials: true,
  autoConnect: true,
  transports: ['websocket', 'polling'] 
});