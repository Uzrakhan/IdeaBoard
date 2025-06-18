import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  _id: string;
  userId: string;
  username: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string, userId: string, username: string) => void;
  logout: () => void;
  currentUser: User
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
      setUser({ _id: userId, userId, username });
    }
  }, []);

  const login = (token: string, userId: string, username: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('username', username);
    setIsAuthenticated(true);
    setUser({ _id: userId, userId, username });
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
    logout,
    currentUser: user as User // or you can use user ?? { userId: '', username: '' } for a fallback
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