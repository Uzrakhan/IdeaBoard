import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  userId: string;
  username: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string, userId: string, username: string) => void;
  logout: () => void;
}

// Define the props for AuthProvider
interface AuthProviderProps {
  children: React.ReactNode;
}

// Create context with proper typing
export const AuthContext = createContext<AuthContextType | null>(null);


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username') || '';

    if (token && userId) {
      setIsAuthenticated(true);
      setUser({ userId, username });
    }
  }, []);

  const login = (token: string, userId: string, username: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('username', username);
    setIsAuthenticated(true);
    setUser({ userId, username });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUser(null);
  };

  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};