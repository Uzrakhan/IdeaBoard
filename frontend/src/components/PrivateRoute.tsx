import { useAuth } from '../context/AuthContext'
import { Outlet,Navigate } from 'react-router-dom'

const PrivateRoute = () => {
    const { isAuthenticated } = useAuth()
  // If the user is authenticated, it renders the child routes
  // Otherwise, it redirects them to the login page
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
}

export default PrivateRoute