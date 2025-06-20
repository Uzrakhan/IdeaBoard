import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:5000/api';


const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})


// Add request interceptor to attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Token being sent in Authorization header:', token);
  }else {
    console.warn('No token found in localStorage');
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
      headers: error.response.headers
    });
    } else if (error.request) {
        console.error('No Response:', error.request);
    } else {
        console.error('Request Error:', error.message);
    }
  return Promise.reject(error);
}

export const login = (username: string, password: string) => 
    api.post(`/auth/login`, { username, password }, {
        headers: { 'Content-Type': 'application/json' }
    })
        .catch(handleError)


export const signup = (username: string, password: string) => 
    api.post(`/auth/signup`, { username, password }, {
    headers: { 'Content-Type': 'application/json' }
    })
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
    console.error('Full room creation error:', {
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
    throw error;
  }
};



export const joinRoom = (roomCode: string) =>
    api.post(`/rooms/${roomCode}/join`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
        .catch(handleError);

export const getRoom = (roomCode: string) => 
    api.get(`/rooms/${roomCode}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
        .catch(handleError);


export const handleRoomRequest = (
    roomCode: string,
    userId: string,
    action: 'approve' | 'reject'
) => 
    api.put(`/rooms/${roomCode}/requests/${userId}`, { action }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });


