import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL;


const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})


// Add request interceptor to attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token && !config.url?.includes('/auth/')) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Token being sent in Authorization header:', token);
  }else if(!config.url?.includes('/auth/')){
    console.warn('No token found in localStorage for a non-auth request');
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Helper to log errors
const handleError = (error: any) => {
    if (error.response) {
    console.error('API Error:', {
      status: error.response.status,
      data: error.response.data,
      headers: error.response.headers,
      config: error.config // Added config to log more context
    });
    } else if (error.request) {
        console.error('No Response:', error.request);
    } else {
        console.error('Request Error:', error.message);
    }
  return Promise.reject(error);
}

export const login = (username: string, password: string) => 
    api.post(`/auth/login`, { username, password })
        .catch(handleError)


export const signup = (username: string, password: string) => 
    api.post(`/auth/signup`, { username, password })
        .catch(handleError);

/*
export const createRoom = () => 
    api.post(`/rooms`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
*/


export const createRoom = async () => {
  try {
    const response = await api.post('/rooms');
    console.log('Room creation response:', response.data);
    return response;
  } catch (error:any) {
    handleError(error);
    throw error;
  }
};

export const joinRoom = (roomCode: string) =>
    api.post(`/rooms/${roomCode}/join`)
        .catch(handleError);

export const getRoom = async (roomCode: string) => {
  try {
    const res = await api.get(`/rooms/${roomCode}`);
    return res.data.room;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export const updateRoomMemberStatus = (
    roomCode: string,
    memberId: string,
    status: 'approved' | 'rejected'
) => 
    api.put(`/rooms/${roomCode}/members/${memberId}/status`, { status }).catch(handleError)


