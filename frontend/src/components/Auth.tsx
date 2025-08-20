import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, signup } from '../api';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from './GoogleAuthButton';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');

        if (!username.trim() || !password.trim()) {
            setMessage('Username and password cannot be empty.');
            return;
        }
        
        try {
            if (isLogin) {
                // Manual Login Logic
                const response = await login(username, password);
                if (response.data.username && response.data.token) {
                    const userData = {
                        _id: response.data.userId,
                        username: response.data.username,
                    }
                    authLogin(response.data.token, userData);
                    navigate('/');
                } else {
                    setMessage('Login failed: User data not found.');
                }
            } else {
                // Signup Logic
                const {} = await signup(username, password);
                setMessage('Signup successful! Please log in.');
                setIsLogin(true); // Automatically switch to the login form
            }
        } catch (error: any) {
            console.error(`${isLogin ? 'Login' : 'Signup'} error:`, error);
            const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
            setMessage(errorMessage);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-700 font-inter">
            <div className="bg-gray-100 p-4 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                    {isLogin ? 'Login' : 'Sign Up'}
                </h2>
                {message && (
                    <div className={`p-3 mb-4 rounded-md text-sm text-center ${message.includes('successful') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full transition-colors duration-200"
                        >
                            {isLogin ? 'Login' : 'Sign Up'}
                        </button>
                    </div>
                </form>
                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                        {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
                    </button>
                </div>
                <div className='relative mt-6'>
                    <div className='absolute inset-0 flex items-center'>
                        <div className='w-full border-t border-gray-300'></div>
                    </div>
                    <div className='relative flex justify-center text-sm'>
                        <span className='bg-white px-2 text-gray-500'>
                            or
                        </span>
                    </div>
                </div>
                <div className='mt-6 flex justify-center'>
                    <GoogleAuthButton />
                </div>
            </div>
        </div>
    );
};

export default Auth;