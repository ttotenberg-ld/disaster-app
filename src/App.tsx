import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@highlight-run/react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { SignUp } from './pages/SignUp';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { useAuthStore, setLDClient } from './store/auth';
import { initializeHighlight } from './lib/highlight';

// Initialize Highlight.io
initializeHighlight();

function App() {
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const ldClient = useLDClient();
  
  // Store LaunchDarkly client reference for use in auth store
  useEffect(() => {
    if (ldClient) {
      setLDClient(ldClient);
    }
  }, [ldClient]);
  
  // Only fetch profile once when app mounts
  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to only run once when component mounts

  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;