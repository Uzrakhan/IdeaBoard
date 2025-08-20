import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({onLogout}) => {
  const navigate = useNavigate();
  //const [username, setUsername] = useState('User')
  //const username = localStorage.getItem('username') || 'User';
  const { user, logout } = useAuth(); // get user and logout from context

  /*
  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (storedUser && storedUser !== 'undefined') {
      try{
        const user = JSON.parse(storedUser);
        if (user && user.username) {
          setUsername(user.username)
        } 
      }catch(error) {
        console.error('Failed to parse user from localStorage:', error);
        localStorage.removeItem('user')
      }
    }
  },[]);
  */

  const username = user?.username || 'User';

  const handleLogout = () => {
    logout(); //use logout from context
    //localStorage.removeItem('user');
    //localStorage.removeItem('appToken');
    //setUsername('User');
    if (onLogout) onLogout();
    navigate('/auth');
  }

  return (
    <header className="bg-indigo-900 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <div className="bg-white p-1 rounded-full">
            <div className="bg-indigo-500 w-8 h-8 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">I</span>
            </div>
          </div>
          <h1 className="text-xl font-bold">IdeaBoard</h1>
        </Link>

        <nav className="hidden md:flex space-x-6">
          <Link to="/" className="hover:text-indigo-200 transition-colors">Home</Link>
          <Link to="/create-room" className="hover:text-indigo-200 transition-colors">Create Room</Link>
          <Link to="/features" className="hover:text-indigo-200 transition-colors">Features</Link>
        </nav>

        {user ? (
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline text-indigo-100">Hello, {username}</span>
            <button 
              onClick={handleLogout}
              className="bg-white text-indigo-700 hover:bg-indigo-100 px-4 py-1 rounded-full font-medium transition-colors"
            >
              Logout
            </button>
          </div>
          ) : (
          <Link 
            to="/auth" 
            className="bg-white text-indigo-700 hover:bg-indigo-100 px-4 py-1 rounded-full font-medium transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  )
}

export default Header