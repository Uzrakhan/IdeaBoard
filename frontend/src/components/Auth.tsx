import React, { useState } from 'react';
import { login, signup } from '../api';

interface AuthProps {
    onAuthSuccess: () => void;
}


const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
         setError('');


        try{
            const response = isLogin ? await login(username, password) 
            : await signup(username, password); 

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userId', response.data.userId);
            onAuthSuccess();
            window.location.href = '/';
        }   catch(err:any) {
            setError(err.response?.data?.message || 'Authentication failed')
        }
    };



  return (
    <div className='auth-container'>
        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
        {error && <div className='error'>{error}</div>}
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <button type="submit" className='bg-slate-600 text-white px-2 py-2'>{isLogin ? 'Login' : 'Create Account'}</button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="toggle-btn">
            {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
        </button>
    </div>
  )
}

export default Auth