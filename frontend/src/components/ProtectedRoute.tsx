import type { JSX } from 'react';
import { useAuth } from '../context/AuthContext'
import { useLocation } from 'react-router-dom';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
    // Redirect them to the /auth page, but save the current URL they were trying to go to
    // so we can redirect them back after they log in.
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;

}

export default ProtectedRoute