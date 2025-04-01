import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { SignUp } from './pages/SignUp';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { useAuthStore } from './store/auth';

function App() {
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  
  // Only fetch profile once when app mounts
  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to only run once when component mounts

  return (
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
  );
}

export default App;