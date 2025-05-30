import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { LogOut, LayoutDashboard, User } from 'lucide-react';
import Logo from './Logo';
// import { getContrastColor } from '../lib/colorUtils'; // No longer needed directly here
import { useBrandingStore } from '../store/branding'; // Import the new store hook

// const CONFIG_API_BASE_URL = 'http://localhost:8001/api'; // No longer needed

// Defaults if localStorage is empty
const DEFAULT_BRAND_COLOR = '#000000';
// const DEFAULT_CONTRAST_COLOR = '#FFFFFF'; // No longer needed
const DEFAULT_FALLBACK_LOGO_URL = 'https://img.logo.dev/launchdarkly.com?token=pk_CV1Cwkm5RDmroDFjScYQRA';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuthStore();
  const {
    logoUrl,
    primaryColor,
    contrastColor,
    // isInitialized, // REMOVE: No longer needed
  } = useBrandingStore();

  // REMOVE useEffect that called loadInitialBranding
  // useEffect(() => {
  //   loadInitialBranding();
  // }, [loadInitialBranding]);

  // Effect to update CSS variables when store colors change
  useEffect(() => {
    // Use store values directly, defaults handled in store initial state
    const effectivePrimary = primaryColor || DEFAULT_BRAND_COLOR;
    const effectiveContrast = contrastColor || '#FFFFFF';

    // Log what's being applied
    console.log(`[Layout useEffect] Updating CSS - Primary: ${effectivePrimary}, Contrast: ${effectiveContrast}`);

    // Set CSS variables on document root
    const root = document.documentElement;
    root.style.setProperty('--brand-primary-color', effectivePrimary);
    root.style.setProperty('--brand-contrast-color', effectiveContrast);

    // Also set on body for fallback
    document.body.style.setProperty('--brand-primary-color', effectivePrimary);
    document.body.style.setProperty('--brand-contrast-color', effectiveContrast);

    // Force a style recalculation
    root.style.display = 'none';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    root.offsetHeight; // trigger reflow
    root.style.display = '';

    console.log(`[Layout useEffect] CSS variables set. Primary: ${root.style.getPropertyValue('--brand-primary-color')}, Contrast: ${root.style.getPropertyValue('--brand-contrast-color')}`);

    // Cleanup function is optional since we always want the latest colors
    return () => {
      // Could remove properties here if needed
    };
  }, [primaryColor, contrastColor]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                {/* Pass logoUrl from store, with fallback */}
                <Logo overrideSrc={logoUrl || DEFAULT_FALLBACK_LOGO_URL} />
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
                  <Link 
                    to="/config" 
                    className="flex items-center text-gray-700 hover:text-gray-900"
                  >
                    Config
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
                    style={{
                      backgroundColor: 'var(--brand-primary-color)',
                      color: 'var(--brand-contrast-color)'
                    }}
                    className={`px-4 py-2 rounded-md hover:opacity-90`}
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