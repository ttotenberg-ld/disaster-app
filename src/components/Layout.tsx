import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { LogOut, LayoutDashboard, User } from 'lucide-react';
import Logo from './Logo';
import { useTheme } from './ThemeProvider';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuthStore();
  const { applyThemeClass } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <Logo />
              </Link>
            </div>
            <div className="flex items-center">
              {user ? (
                <div className="flex items-center space-x-4">
                  <Link 
                    to="/dashboard" 
                    className="flex items-center text-gray-700 hover:text-gray-900"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-1" />
                    Dashboard
                  </Link>
                  <Link 
                    to="/profile" 
                    className="flex items-center text-gray-700 hover:text-gray-900"
                  >
                    <User className="w-4 h-4 mr-1" />
                    Profile
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center text-gray-700 hover:text-gray-900"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-gray-900"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className={`${applyThemeClass()} text-white px-4 py-2 rounded-md hover:opacity-90`}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
};