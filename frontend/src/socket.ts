import { io } from 'socket.io-client';

/*
export const socket = io('http://localhost:5000', {
    withCredentials: true,
    autoConnect: true
});
*/

//use different path in development, will be different in production
const SOCKET_URL = import.meta.env.DEV
? 'http://localhost:5000'
: 'https://idea-board-virid.vercel.app/';


export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: true,
  transports: ['websocket', 'polling'] 
});