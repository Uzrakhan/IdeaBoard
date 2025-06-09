import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:5000/api';

export const login = (username: string, password: string) => 
    axios.post(`${API_URL}/auth/login`, { username, password });


export const signup = (username: string, password: string) => 
    axios.post(`${API_URL}/auth/signup`, { username, password });

export const createRoom = () => 
    axios.post(`${API_URL}/rooms`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });


export const joinRoom = (roomId: string) =>
    axios.post(`${API_URL}/rooms/${roomId}/join`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

export const getRoom = (roomId: string) => 
    axios.get(`${API_URL}/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

export const handleRoomRequest = (
    roomId: string,
    userId: string,
    action: 'approve' | 'reject'
) => 
    axios.put(`${API_URL}/rooms/${roomId}/requests/${userId}`, { action }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });


