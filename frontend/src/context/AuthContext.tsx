import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  _id: string;
  username: string;
  name?: string;     // for Google users
  email?: string;    // Google only
  picture?: string;  // Google only
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => void;
  currentUser: User | null;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for both the token and the user object on component mount
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser && storedUser !== 'undefined') {
      try {
        const parsedUser = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
        logout(); // Clear storage if data is corrupted
      }
    } else {
      logout();
    }
  }, []);

  // ✅ The login function now accepts a single user object
  const login = async (token: string, userData: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    login,
    logout,
    currentUser: user,
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