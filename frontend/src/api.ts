import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:5000/api';
//const API_URL = 'http://localhost:5000/api'

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
  console.error('⚠️ API Error - Full details:', error);
  if (error.response) {
    console.error('📡 Response error:', {
      status: error.response.status,
      data: error.response.data,
      headers: error.response.headers,
      config: error.config
    });
  } else if (error.request) {
    console.error('❌ No response received:', error.request);
  } else {
    console.error('🛠️ Request error:', error.message);
  }
  return Promise.reject(error); // <- not the cause, just forwarding it
};


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

    // Check if the response data contains a 'room' property (for unapproved/pending users)
    // or if it's the room object directly (for owner/approved users).
    if (res.data && res.data.room) {
      console.log("[getRoom API] Detected nested 'room' object, returning res.data.room");
      return res.data.room ; //return the nested room object
    }else if (res.data) {
      console.log("[getRoom API] Detected direct room object, returning res.data");
      return res.data; // Return the direct room object
    }else {
      console.warn("[getRoom API] Unexpected empty response from /rooms/:roomCode");
      throw new Error("Empty response when fetching room details.");
    }
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
   //ADDED memberId to request body
    api.put(`/rooms/${roomCode}/members/${memberId}/status`, { memberId ,status }).catch(handleError)


