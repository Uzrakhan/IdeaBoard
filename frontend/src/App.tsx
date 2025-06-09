// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import Auth from './components/Auth';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import Whiteboard from './components/Whiteboard';
import type { Room } from './types';
import { getRoom } from './api';

// Main App Component
const App: React.FC = () => {
  //State to track user authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  //Store the currently active room details
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  //Check user authetication on initial load
  useEffect(() => {
    const token = localStorage.getItem('token'); //Fetch authentication token
    const userId = localStorage.getItem('userId'); //Fetch user ID
    setIsAuthenticated(!!token && !!userId); //Update authentication state
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Auth route */}
          <Route 
            path="/auth" 
            element={
              isAuthenticated ? 
                <Navigate to="/" /> :  //Redirect to dashboard if authenticated
                <Auth onAuthSuccess={() => setIsAuthenticated(true)} /> // Render Auth component
            } 
          />
          
          {/* Create room (dashboard) */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
                <CreateRoom onRoomCreated={setCurrentRoom} /> :  //Render CreateRoom if authenticated
                <Navigate to="/auth" /> //Redirect to authentication page if not authenticated
            } 
          />
          
          {/* Route for joining a room */}
          <Route
            path="/join/:roomId"
            element={
              isAuthenticated ? (
                <JoinRoomWrapper currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} /> // Render JoinRoomWrapper
              ) : (
                <Navigate to="/auth" /> // Redirect to authentication page if not authenticated
              )
            }
          />

          {/* Route for accessing a whiteboard */}
          <Route
            path="/room/:roomId"
            element={
              isAuthenticated && currentRoom ? (
                <Whiteboard room={currentRoom} /> // Render Whiteboard if authenticated and room exists
              ) : (
                <Navigate to="/" /> // Redirect to dashboard if room doesn't exist
              )
            }
          />

          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
};

// Wrapper for JoinRoom to handle room loading
interface JoinRoomWrapperProps {
  currentRoom: Room | null; // Currently active room
  setCurrentRoom: (room: Room) => void;// Function to update active room
}

// Wrapper component for joining a room
const JoinRoomWrapper: React.FC<JoinRoomWrapperProps> = ({ currentRoom, setCurrentRoom }) => {
  const { roomId } = useParams<{ roomId: string }>(); // Extract room ID from URL
  const navigate = useNavigate();// Hook for navigation
  const [isLoading, setIsLoading] = useState(true); // State to track loading status
  const [error, setError] = useState('');// State to track errors

  // Fetch room details when roomId changes
  useEffect(() => {
    const fetchRoom = async () => {
      if (!roomId) return;
      
      try {
        const response = await getRoom(roomId);// Fetch room data from API
        setCurrentRoom(response.data);// Update current room state
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load room');// Handle API errors
      } finally {
        setIsLoading(false);// Stop loading spinner
      }
    };
    
    fetchRoom();
  }, [roomId, setCurrentRoom]);


  // Redirect user to the whiteboard if they are an approved member
  useEffect(() => {
    if (!currentRoom) return;

    const userId = localStorage.getItem('userId');// Fetch user ID from local storage
    if (currentRoom && userId) {
      const isMember = currentRoom.members.some(
        m => m.user._id === userId && m.status === 'approved' // Check if user is an approved member
      );
      
      if (isMember) {
        navigate(`/room/${currentRoom.roomId}`); // Navigate to whiteboard
      }
    }
  }, [currentRoom, navigate]);

  // Display loading spinner while fetching room details
  if (isLoading) return <div>Loading room...</div>;

  // Display error message if fetching room details fails
  if (error) return <div className="error">{error}</div>;
  
  // Render JoinRoom component if room details are successfully loaded
  return currentRoom ? <JoinRoom room={currentRoom} /> : null;
};

export default App;