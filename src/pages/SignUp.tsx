import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useAuthStore } from '../store/auth';
import { identifyUser } from '../lib/highlight';
import { createUserContext } from '../lib/launchdarkly';
import { H } from 'highlight.run';
import { generateRandomUserProfile } from '../lib/randomUser';

export const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const signUp = useAuthStore((state) => state.signUp);
  const ldClient = useLDClient();
  
  // Initialize with random values on component mount
  useEffect(() => {
    const profile = generateRandomUserProfile();
    setEmail(profile.email);
    setPassword(profile.password);
    
    // Store the profile data in sessionStorage for use during signup
    sessionStorage.setItem('demoProfile', JSON.stringify({
      fullName: profile.fullName,
      username: profile.username,
      website: profile.website
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signUp(email, password);
      
      // Get the user from the store after successful sign-up
      const user = useAuthStore.getState().user;
      
      if (user) {
        // Identify the user with Highlight.io
        identifyUser(user.email, user.id);
        
        // Update LaunchDarkly context with user information
        if (ldClient) {
          await ldClient.identify(createUserContext(user.email, user.id));
        }
      }
      
      navigate('/profile');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during signup';
      
      // Log the error to Highlight
      H.track('SignUp Error', { 
        errorMessage,
        email,
        timestamp: new Date().toISOString()
      });
      
      // Check if it's a server error (500) which would be from our intentional demo errors
      if (errorMessage.includes('Service temporarily unavailable') || 
          errorMessage.includes('high load') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('Backend service')) {
        // This is a demo error triggered by the new_auth flag
        setError(`Error: ${errorMessage}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 border border-gray-300 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            style={{
              backgroundColor: 'var(--brand-primary-color)',
              color: 'var(--brand-contrast-color)'
            }}
            className="font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full hover:opacity-90 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </div>
      </form>
    </div>
  );
};