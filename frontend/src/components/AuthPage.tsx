import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, signup } from '../api';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from './GoogleAuthButton';

const AuthPage: React.FC = () => { 
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login: authLogin } = useAuth();

    const from = location.state?.from?.pathname || '/';

    useEffect(() => {
        setMessage('');
    }, [isLogin]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsLoading(true);

        if (!username.trim() || !password.trim()) {
            setMessage('Username and password cannot be empty.');
            setIsLoading(false);
            return;
        }
        
        try {
            if (isLogin) {
                const response = await login(username, password);
                if (response.data.user && response.data.token) {
                    authLogin(response.data.token, response.data.user);
                    navigate(from, { replace: true });
                } else {
                    setMessage('Login failed: User data not found.');
                }
            } else {
                await signup(username, password);
                setMessage('Signup successful! Please log in.');
                setIsLogin(true);
            }
        } catch (error: any) {
            console.error(`${isLogin ? 'Login' : 'Signup'} error:`, error);
            const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
            setMessage(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const loginSwitchLink = isLogin 
        ? <span className="text-blue-600 hover:text-blue-800 transition-colors duration-150">Sign Up</span> 
        : <span className="text-blue-600 hover:text-blue-800 transition-colors duration-150">Login</span>;

    const floatVariants = {
        // Defines the keyframes for the continuous floating motion
        float: {
            y: [0, -10, 0, 10, 0], // Move up 10px, back to center, down 10px, back to center
            opacity: [1, 0.8, 1, 0.9, 1], // Subtle opacity change for depth/flow
            transition: {
                y: {
                    duration: 6,
                    ease: "easeInOut",
                    repeat: Infinity, // Loop continuously
                },
                opacity: {
                    duration: 6,
                    ease: "easeInOut",
                    repeat: Infinity,
                }
            },
        },
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-800 font-sans p-4 overflow-hidden">
            
            <div className="flex bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-3xl h-auto">
                
                {/* 2. Left Side: Abstract Background (Kept width ratio: 1/2) */}
                <div 
                    className="w-1/2 hidden flex-shrink-0 md:flex flex-col items-center justify-center"
                    style={{
                        // Placeholder style for the abstract background from the original image
                        background: 'linear-gradient(135deg, #a7b6ff 0%, #ffc6a7 50%, #ff5e62 100%)',
                    }}
                >
                    
                </div>

                {/* 3. Right Side: Login/Sign Up Form (Tighter Padding) */}
                <div className="w-full md:w-1/2 p-6 flex flex-col justify-center bg-gray-50">
                    <h2 className="text-3xl font-semibold text-gray-900 mb-6"> {/* Smaller header text */}
                        {isLogin ? 'Login' : 'Sign Up'}
                    </h2>
                    
                    {/* Message Area */}
                    {message && (
                        <div className={`p-2 mb-4 rounded-lg text-sm font-medium text-center ${message.includes('successful') ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4"> {/* Reduced vertical space */}
                        {/* Username Input */}
                        <div>
                            <label htmlFor="username" className="block text-xs text-gray-500 mb-1"> {/* Smaller label text */}
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                className="w-full p-2 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100" // Smaller padding and rounded corners
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        
                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-xs text-gray-500 mb-1"> {/* Smaller label text */}
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                className="w-full p-2 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100" // Smaller padding and rounded corners
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`${
                                isLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            } text-white font-medium py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full transition-colors duration-200 flex justify-center items-center text-sm`} // Smaller button size and font
                        >
                            {isLoading ? (
                                <div className='flex items-center space-x-2'>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 004 12z"></path>
                                    </svg>
                                    <span>Please Wait...</span>
                                </div>
                            ) : (
                                isLogin ? 'Login' : 'Sign Up'
                            )}
                        </button>
                    </form>

                    {/* Switch Login/Signup Link */}
                    <div className="mt-3 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-xs text-gray-500 hover:text-gray-700" // Smaller text
                        >
                            {isLogin ? 'Need an account?' : 'Already have an account?'} {loginSwitchLink}
                        </button>
                    </div>

                    {/* 'or' Separator */}
                    <div className='relative my-4'> {/* Reduced vertical margin */}
                        <div className='absolute inset-0 flex items-center'>
                            <div className='w-full border-t border-gray-200'></div>
                        </div>
                        <div className='relative flex justify-center text-xs'> {/* Smaller text */}
                            <span className='bg-gray-50 px-2 text-gray-500 font-light'>
                                or
                            </span>
                        </div>
                    </div>

                    {/* Google Auth Button */}
                    <div className='flex justify-center'>
                        <GoogleAuthButton redirectTo={from}/>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;