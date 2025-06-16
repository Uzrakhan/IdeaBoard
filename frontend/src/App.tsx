// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import Auth from './components/Auth';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import Whiteboard from './components/Whiteboard';
import type { Room } from './types';
import { getRoom } from './api';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import { AuthProvider } from './context/AuthContext';

//layout component to wrap pages with header & footer
const Layout = ({children}: { children: React.ReactNode}) => {
  const location = useLocation();

  //hide header & footer on auth page
  const hideOnAuth = location.pathname === '/auth';

  return (
    <div className='app-layout'>
      {!hideOnAuth && <Header />}
      <main className='main-content'>
        {children}
      </main>
      {!hideOnAuth && <Footer />}
    </div>
  )
}


// Main App Component
const App: React.FC = () => {
  //State to track user authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  //Store the currently active room details
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  const [loadingAuth, setLoadingAuth] = useState(true);

  //Check user authetication on initial load
  useEffect(() => {
    const token = localStorage.getItem('token'); //Fetch authentication token
    console.log('Token being sent:', token);
    console.log('Token type:', typeof token);
    console.log('Token length:', token?.length);
    
    const userId = localStorage.getItem('userId'); //Fetch user ID
    setIsAuthenticated(!!token && !!userId); //Update authentication state
    setLoadingAuth(false);
  }, []);

  //logout logic
  /*
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    setCurrentRoom(null);
    setIsAuthenticated(false);
  };
  */


  if (loadingAuth) {
    return <div className="app-loading">Loading...</div>;
  }

  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Routes>
            {/* Public routes */}
            <Route 
              path="/auth" 
              element={
                <Auth />
              }
            />

            {/* Private routes with layout */}
            <Route 
            path='/'
            element={
              isAuthenticated ? (
                <Layout>
                  <Home />
                </Layout>
              ) : (
                <Navigate to="/auth"/>
              )
            }
            />
            
            {/* Create room (dashboard) */}
            <Route 
              path="/create-room" 
              element={
                isAuthenticated ? (
                  <Layout>
                    <CreateRoom setCurrentRoom={setCurrentRoom} onRoomCreated={function (): void {
                      throw new Error('Function not implemented.');
                    } }/>
                  </Layout>
                ) : (
                  <Navigate to="/auth"/>
                )
              } 
            />
            
            {/* Route for joining a room */}
            <Route
              path="/join/:roomId"
              element={
                isAuthenticated ? (
                  <Layout>
                    <JoinRoomWrapper currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} />
                  </Layout>
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
                  <Layout>
                    <Whiteboard room={currentRoom} /> 
                  </Layout>
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
    </AuthProvider>
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
  return currentRoom ? <JoinRoom setCurrentRoom={setCurrentRoom} /> : null;
};

export default App;