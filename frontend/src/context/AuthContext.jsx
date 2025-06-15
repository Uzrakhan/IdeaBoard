import React, { createContext, useContext, useState, useEffect } from 'react';

// TypeScript interfaces removed for JS compatibility

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username') || '';

        if (token && userId) {
            setIsAuthenticated(true)
            setUser({_id: userId, username})
        }
    }, []);

    const login = (token: string, userId: string, username: string) => {
        localStorage.setItem('token', token);
        localStorage.setItem('userId', userId)
        localStorage.setItem('username', username);
        setIsAuthenticated(true);
        setUser({ _id: userId, username})
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        setIsAuthenticated(false);
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout}}>
            {children}
        </AuthContext.Provider>
    )
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context;
}