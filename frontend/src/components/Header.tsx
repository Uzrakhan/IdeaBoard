import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { HashLink as Link } from 'react-router-hash-link'
import { useAuth } from '../context/AuthContext';
import { Menu, X, Sparkles } from 'lucide-react';

interface HeaderProps {
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const username = user?.username || 'User';

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <NavLink to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-gradient-to-br from-violet-600 to-fuchsia-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-clip-text text-transparent">
                IdeaBoard
              </h1>
            </div>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <NavLink 
              to="/" 
              className="px-4 py-2 text-slate-700 hover:text-violet-600 font-medium transition-colors rounded-lg hover:bg-violet-50"
            >
              Home
            </NavLink>
            <NavLink 
              to="/create-room" 
              className="px-4 py-2 text-slate-700 hover:text-violet-600 font-medium transition-colors rounded-lg hover:bg-violet-50"
            >
              Create Room
            </NavLink>
            <Link 
              to="/#features" // The link to the Home route + hash
              className="px-4 py-2 text-slate-700 hover:text-violet-600 font-medium transition-colors rounded-lg hover:bg-violet-50"
              scroll={(el: { scrollIntoView: (arg0: { behavior: string; }) => any; }) => el.scrollIntoView({ behavior: 'smooth' })} // Optional: ensure smooth scroll
            >
              Features
            </Link>
          </nav>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200/50">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-fuchsia-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {username[0].toUpperCase()}
                  </div>
                  <span className="text-slate-700 font-medium">
                    {username}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link 
                to="/auth" 
                className="hidden md:block px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105"
              >
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:text-violet-600 transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-slate-200/50 pt-4 space-y-2">
            <NavLink 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-slate-700 hover:text-violet-600 font-medium transition-colors rounded-lg hover:bg-violet-50"
            >
              Home
            </NavLink>
            <NavLink 
              to="/create-room" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-slate-700 hover:text-violet-600 font-medium transition-colors rounded-lg hover:bg-violet-50"
            >
              Create Room
            </NavLink>
            <Link 
              to="/#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-slate-700 hover:text-violet-600 font-medium transition-colors rounded-lg hover:bg-violet-50"
              scroll={(el: { scrollIntoView: (arg0: { behavior: string; }) => any; }) => el.scrollIntoView({ behavior: 'smooth' })}
            >
              Features
            </Link>
            
            {user ? (
              <div className="space-y-2 pt-2">
                <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-lg border border-violet-200/50">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-fuchsia-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {username[0].toUpperCase()}
                  </div>
                  <span className="text-slate-700 font-medium">
                    {username}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300"
                >
                  Logout
                </button>
              </div>
            ) : (
              <NavLink 
                to="/auth" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300 text-center"
              >
                Login
              </NavLink>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;