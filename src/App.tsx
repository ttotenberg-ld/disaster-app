import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { SignUp } from './pages/SignUp';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import ConfigurationPage from './pages/ConfigurationPage';
import { DebugBranding } from './pages/DebugBranding';
import { useAuthStore, setLDClient } from './store/auth';
import { useBrandingStore } from './store/branding';
import { ThemeProvider } from './components/ThemeProvider';


// Lazy load components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Payment = lazy(() => import('./pages/Payment'));

function App() {
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const loadInitialBranding = useBrandingStore((state) => state.loadInitialBranding);
  const ldClient = useLDClient();
  
  // Store LaunchDarkly client reference for use in auth store
  useEffect(() => {
    if (ldClient) {
      setLDClient(ldClient);
    }
  }, [ldClient]);
  
  // Initialize branding store from localStorage
  useEffect(() => {
    loadInitialBranding();
  }, [loadInitialBranding]);
  
  // Only fetch profile once when app mounts
  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to only run once when component mounts

  // Loading component for lazy-loaded routes
  const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/config" element={<ConfigurationPage />} />
              <Route path="/debug-branding" element={<DebugBranding />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;