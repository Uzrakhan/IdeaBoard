// App.tsx (Fixed)

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

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const hideOnAuth = location.pathname === '/auth';
  return (
    <div className='app-layout'>
      {!hideOnAuth && <Header />}
      <main className='main-content'>{children}</main>
      {!hideOnAuth && <Footer />}
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    setIsAuthenticated(!!token && !!userId);
    setLoadingAuth(false);
  }, []);

  if (loadingAuth) return <div className="app-loading">Loading...</div>;

  const onRoomCreated = (room: Room) => {
    setCurrentRoom(room);
  };

  return (
    <AuthProvider>
      <div className="app-container">
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Layout>
                  <Home />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/create-room"
            element={
              isAuthenticated ? (
                <Layout>
                  <CreateRoom setCurrentRoom={setCurrentRoom} onRoomCreated={onRoomCreated} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/join/:roomCode"
            element={
              isAuthenticated ? (
                <Layout>
                  <JoinRoomWrapper currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} />
                </Layout>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
          <Route
            path="/room/:roomCode"
            element={
              isAuthenticated ? (
                <Layout>
                  <WhiteboardWrapper setCurrentRoom={setCurrentRoom} />
                </Layout>
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </AuthProvider>
  );
};

const WhiteboardWrapper: React.FC<{ setCurrentRoom: React.Dispatch<React.SetStateAction<Room | null>> }> = ({ setCurrentRoom }) => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!roomCode) return;
      try {
        const data = await getRoom(roomCode);
        if(!data) throw new Error('Room not found');
        setRoom(data.room);
        setCurrentRoom(data.room);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load room');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchRoomDetails();
  }, [roomCode, navigate, setCurrentRoom]);

  if (loading) return <div>Loading whiteboard...</div>;
  if (error) return <div className="text-center text-red-600">Error: {error}</div>;
  if (!room) return <div className="text-center">Room not found !!!!!!</div>;

  return <Whiteboard />;
};

const JoinRoomWrapper: React.FC<{
  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;
}> = ({ currentRoom, setCurrentRoom }) => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchRoom = async () => {
      if (!roomCode) return;

      if (currentRoom && currentRoom.roomCode === roomCode) {
        const isApproved = currentRoom.members?.some(
          (m: any) => m?.user?._id?.toString() === userId && m.status === 'approved'
        );
        if (isApproved) {
          navigate(`/room/${roomCode}`);
          return;
        }
      }

      try {
        const data = await getRoom(roomCode);
        setCurrentRoom(data.room);
        const isApproved = data.room.members?.some(
          (m: any) => m?.user?._id?.toString() === userId && m.status === 'approved'
        );
        if (isApproved) navigate(`/room/${roomCode}`);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load room');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoom();
  }, [roomCode, userId]);

  if (isLoading) return <div>Loading room...</div>;
  if (error) return <div className="error">{error}</div>;
  return currentRoom ? <JoinRoom room={currentRoom} /> : null;
};

export default App;
