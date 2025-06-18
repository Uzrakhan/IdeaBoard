// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
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

  const navigate = useNavigate();

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

  const onRoomCreated = (room: Room) => {
    setCurrentRoom(room);
    console.log(`Frontend: Room created with code: ${room.roomCode}. Redirecting...`);
    navigate(`/room/${room.roomCode}`); // Redirect to the new room's page
  }

  return (
    <AuthProvider>
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
                    <CreateRoom setCurrentRoom={setCurrentRoom} onRoomCreated={onRoomCreated}/>
                  </Layout>
                ) : (
                  <Navigate to="/auth"/>
                )
              } 
            />
            
            {/* Route for joining a room */}
            <Route
              path="/join/:roomCode"
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
              path="/room/:roomCode"
              element={
                isAuthenticated && currentRoom ? (
                  <Layout>
                    <WhiteboardWrapper setCurrentRoom={setCurrentRoom}/> 
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
    </AuthProvider>
  );
};

// --- NEW WRAPPER FOR WHITEBOARD ---
// This ensures Whiteboard fetches its own room data when the URL changes
interface WhiteboardWrapperProps {
  setCurrentRoom: (room: Room) => void;
}

const WhiteboardWrapper: React.FC<WhiteboardWrapperProps> = ({ setCurrentRoom }) => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [room,setRoom] = useState<Room | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!roomCode) {
        setError("No room code provided in URL.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await getRoom(roomCode);
        console.log("Fetched room data:", response.data); // Added this line
        setRoom(response.data);
        setCurrentRoom(response.data);
      }catch(err: any) {
        console.error("Error fetching room for whiteboard:", err);
        setError(err.response?.data?.message || 'Failed to load room details.');
        navigate('/'); // Redirect to home/dashboard on error
      }finally {
        setLoading(false);
      }
    };
    fetchRoomDetails();
  },[roomCode, navigate, setCurrentRoom]);


    if (loading) return <div>Loading whiteboard...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!room) return <Navigate to="/" />; // Should not happen if error handled

    return <Whiteboard room={room} />;

}

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
        navigate(`/room/${currentRoom.roomCode}`); // Navigate to whiteboard
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