import React, { useState } from 'react';
import { login, signup } from '../api';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';



// Removed the AuthProps interface since we're not using onAuthSuccess anymore
const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [globalError, setGlobalError] = useState(''); // For general authentication errors
    const [usernameError, setUsernameError] = useState(''); // For username specific errors
    const [passwordError, setPasswordError] = useState(''); // For password specific errors
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login: authLogin } = useAuth(); // Get login function from AuthContext

    //Validation logic
    const validateUsername = (username: string): string => {
        if(!username.trim()) {
            return 'Username is required.'
        }
        if(username.length < 3) {
            return 'Username must be at least 3 characters.'
        }

        if (username.length > 20) {
            return 'Username cannot exceed 20 characters.';
        }

        //more specific username validation if
        if(!/^[a-zA-Z0-9_]+$/.test(username)) {
            return 'Username can only contain letters, numbers, and underscores.';
        }

        return '';
    }

    const validatePassword = (password: string): string => {
        if(!password) {
            return 'Password is required.'
        }

        if (password.length < 6) {
            return 'Password must be at least 6 characters long.';
        }

        if (password.length > 50) {
            return 'Password cannot exceed 50 characters.';
        }

        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
           return 'Password must include uppercase, lowercase, number, and special character.';
        }

        return '';
    }

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUsername(value);
        setUsernameError(validateUsername(value))
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPassword(value);
        setPasswordError(validatePassword(value)); // Validate on change
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGlobalError('')

        const usernameErrMsg = validateUsername(username);
        const passwordErrMsg = validatePassword(password);

        setUsernameError(usernameErrMsg);
        setPasswordError(passwordErrMsg);

        if (usernameErrMsg || passwordErrMsg) {
            return;
        }


        setIsLoading(true);

        try {
            const response = isLogin 
                ? await login(username, password) 
                : await signup(username, password); 

            // Use context login function instead of directly setting localStorage
            authLogin(response.data.token, response.data.userId, username);
            
            navigate('/'); // Redirect to home after successful auth
        } catch(err:any) {
            setGlobalError(err.response?.data?.message || 'Authentication failed')
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
                <div className="text-center">
                    <div className="mx-auto bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <span className="text-white text-2xl font-bold">I</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">
                        {isLogin ? 'Sign in to your account' : 'Create a new account'}
                    </h2>
                    <p className="mt-2 text-gray-600">
                        {isLogin 
                            ? 'Enter your credentials to access your boards' 
                            : 'Set up your account to start collaborating'}
                    </p>
                </div>

                {globalError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md">
                        {globalError}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ${usernameError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                                value={username}
                                onChange={handleUsernameChange}
                                onBlur={() => setUsernameError(validateUsername(username))} // Validate on blur as well
                            />
                            {usernameError && (
                                <p className="mt-2 text-sm text-red-600">{usernameError}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ${passwordError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                                value={password}
                                onChange={handlePasswordChange}
                                onBlur={() => setPasswordError(validatePassword(password))} // Validate on blur as well
                            />
                            {passwordError && (
                                <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading || !!usernameError || !!passwordError}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : isLogin ? (
                                'Sign In'
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin)
                            setUsername('');
                            setPassword('')
                            setUsernameError('')
                            setPasswordError('')
                            setGlobalError('')
                        }
                        }
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        {isLogin 
                            ? 'Need an account? Sign Up' 
                            : 'Already have an account? Sign In'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// REMOVED THE LOCAL useAuth FUNCTION - USING CONTEXT VERSION INSTEAD

export default Auth;

function useAuth(): { login: (token: string, userId: string, username: string) => void } {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return { login: context.login };
}
