import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const GoogleAuthButton:React.FC = () => {
    // to remember who logged-in
    //const [user,setUser] = useState(null);
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();

    //this hook runs only once when the component loads
    // its job is to check if a user is already logged in
    // from a previous session by looking in localStorage
    

    //this function handles the login success procedure
    // here its a 2-step process
    const handleLoginSuccess = async (response: any) => {
        // STEP 1 is GET THE ID TOKEN FROM GOOGLE
        // we do this by extracting the 'token' from the the obejct provided by Google
        // which contains the 'credential' 
        const idToken = response.credential;

        //STEP 2 is AUTHENTICATE THE ID TOKEN WITH OUR BACKEND
        // We shouldn't directly verify the id token with app's protected resources
        // Instead, we send the ID Token to our backend's server
        // If the token is valid then backend issues an appToken which will be unique to my app
        try{
            const backendResponse = await axios.post('http://localhost:5000/api/auth/google', { credential: idToken });

            if (backendResponse.data.user && backendResponse.data.token) {
                authLogin(backendResponse.data.token, backendResponse.data.user);
                navigate('/');
            } else {
                console.error('Login failed: User data not found in response.');
                alert('Login failed. Please try again.');
            }
        } catch(error) {
            console.error('Login failed:', error);
            alert('Login failed. Please try again.')
        }
    }

    /*
    const handleLogout = () => {
        localStorage.removeItem('appToken');
        localStorage.removeItem('user');
        setUser(null);
    }
    */


    
  return (
    <GoogleLogin 
        onSuccess={handleLoginSuccess} 
        onError={() => {
            console.log('Login failed.')
        }}
    />
  )
}

export default GoogleAuthButton