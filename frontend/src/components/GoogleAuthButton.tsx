import React, { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

const GoogleAuthButton:React.FC = () => {
    // to remember who logged-in
    const [user,setUser] = useState(null);

    //this hook runs only once when the component loads
    // its job is to check if a user is already logged in
    // from a previous session by looking in localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try{
                //if user is already logged in then store them in setUser
                setUser(JSON.parse(storedUser))
            }catch(error) {
                console.error('Failed to parse user from localstorage:', error);
                localStorage.removeItem('user');
                localStorage.removeItem('appToken')
            }
        }
    },[]);

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
            const backendResponse = await axios.post('http://localhost:5000/api/auth/google', { token: idToken });

            // now we want the user data and the appToken to be remembered , so that user can login and thier data is remembered
            localStorage.setItem('appToken', backendResponse.data.appToken);
            localStorage.setItem('user', JSON.stringify(backendResponse.data.user));

            // we store the saved user in setUser
            setUser(backendResponse.data.user);
        } catch(error) {
            console.error('Login failed:', error);
            alert('Login failed. Please try again.')
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('appToken');
        localStorage.removeItem('user');
        setUser(null);
    }

    if(user) {
        return (
            <div className=''>
                <p>Welcome</p>
                <img 
                    
                    alt="User profile" 
                    style={{ width: 40, height: 40, borderRadius: '50%' }} 
                />
                <button onClick={handleLogout}>
                    Logout
                </button>
            </div>
        )
    }

    
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