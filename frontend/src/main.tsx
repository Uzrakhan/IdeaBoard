import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter as Router } from 'react-router-dom'; // Import BrowserRouter
import { AuthProvider } from './context/AuthContext.tsx'

// Get the client ID from your environment variables
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (!googleClientId) {
    console.error('Google Client ID is not set in environment variables.');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      {googleClientId && (
      <GoogleOAuthProvider clientId={googleClientId}>
        <Router>
          <AuthProvider>
            <App />
          </AuthProvider>
        </Router>
      </GoogleOAuthProvider>
    )}
  </StrictMode>
)
