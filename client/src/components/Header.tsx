import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Trophy, User, LogOut, Settings } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-green-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-yellow-300" />
            <h1 className="text-2xl font-bold">AlphaBet</h1>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-yellow-300 transition-colors">
              Home
            </Link>
            <Link to="/matches" className="hover:text-yellow-300 transition-colors">
              Matches
            </Link>
            {user && (
              <Link to="/predictions" className="hover:text-yellow-300 transition-colors">
                My Predictions
              </Link>
            )}
            <Link to="/standings" className="hover:text-yellow-300 transition-colors">
              Standings
            </Link>
            <Link to="/leaderboard" className="hover:text-yellow-300 transition-colors">
              Leaderboard
            </Link>
            {user?.is_admin && (
              <Link to="/admin" className="hover:text-yellow-300 transition-colors">
                <Settings className="h-4 w-4 inline mr-1" />
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{user.username}</span>
                  <span className="text-yellow-300 font-bold">
                    {user.total_points} pts
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-white hover:text-yellow-300 hover:bg-green-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:text-yellow-300 hover:bg-green-700">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-green-900">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
