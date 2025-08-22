import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/ReactToastify.css';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Auth from './components/Auth';
import { login } from './api';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import { AuthProvider, useAuth } from './context/AuthContext';
import CreateRoomWrapper from './components/CreateRoomWrapper';
import JoinRoomWrapper from './components/JoinRoomWrapper';
import WhiteboardWrapper from './components/WhiteboardWrapper';
import ProtectedRoute from './components/ProtectedRoute';

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

const AppRoutes = () => {
  const { isAuthenticated, login: contextLogin } = useAuth();
  const [loading,setLoading] = useState(true);
  //const location = useLocation();

  console.log('AppRoutes: isAuthenticated is', isAuthenticated); // <-- Add this line
  console.log('AppRoutes: Current path is', location.pathname); // <-- Add this line


  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser && storedUser !== 'undefined') {
      try{
        const parsedUser = JSON.parse(storedUser);
        login(storedToken, parsedUser)
      }catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false)
  }, [contextLogin])

  if (loading) return <div className="app-loading">Loading...</div>;

  return (
    <Routes>
      <Route path='/auth' element={isAuthenticated ? <Navigate to="/" /> : <Auth />}/>
      <Route path='/' element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>}/>
      <Route path='/create-room' element={<ProtectedRoute><Layout><CreateRoomWrapper /></Layout></ProtectedRoute>}/>
      <Route path="/join/:roomCode" element={<ProtectedRoute><Layout><JoinRoomWrapper /></Layout></ProtectedRoute>} />
      <Route path="/room/:roomCode" element={<ProtectedRoute><Layout><WhiteboardWrapper /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

const App: React.FC = () => (
  <AuthProvider>
    <AppRoutes />
    <ToastContainer position='top-right' autoClose={5000} 
      hideProgressBar={false} closeOnClick rtl={false} 
      pauseOnFocusLoss draggable pauseOnHover
    />
  </AuthProvider>
);



export default App;
