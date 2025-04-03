import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDefaultContext } from '../lib/launchdarkly';
import { signUp as apiSignUp, login as apiLogin, getProfile, updateProfile, User, UpdateProfileData } from '../lib/api';
import { LDContext } from 'launchdarkly-react-client-sdk';
import { generateRandomFullName, generateRandomUsername, generateRandomWebsite } from '../lib/randomUser';

// Define the LaunchDarkly client interface (minimal implementation)
interface LDClient {
  identify: (context: LDContext) => Promise<void>;
}

// Global reference to LaunchDarkly client for use in actions like signOut
let ldClientInstance: LDClient | null = null;

export const setLDClient = (client: LDClient) => {
  ldClientInstance = client;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  fetchProfile: () => Promise<void>;
};

type SetAuthState = (
  partial: AuthState | Partial<AuthState> | ((state: AuthState) => AuthState | Partial<AuthState>),
  replace?: boolean
) => void;

type GetAuthState = () => AuthState;

export const useAuthStore = create<AuthState>()(
  persist(
    (set: SetAuthState, get: GetAuthState) => ({
      user: null,
      token: null,
      isLoading: false,
      signUp: async (email: string, password: string) => {
        try {
          const user = await apiSignUp(email, password);
          // After signup, we need to login to get the token
          const token = await apiLogin(email, password);
          set({ user, token });
          
          // Automatically set profile data from the saved demo profile or generate new random data
          if (token) {
            let profileData: UpdateProfileData;
            const savedProfile = sessionStorage.getItem('demoProfile');
            
            if (savedProfile) {
              // Use the saved profile data if available
              profileData = JSON.parse(savedProfile);
            } else {
              // Otherwise generate random data
              profileData = {
                fullName: generateRandomFullName(),
                username: generateRandomUsername(),
                website: generateRandomWebsite()
              };
            }
            
            try {
              const updatedUser = await updateProfile(token, profileData);
              set({ user: updatedUser });
              
              // Save the email for login consistency
              sessionStorage.setItem('lastDemoEmail', email);
            } catch (error: unknown) {
              console.error('Failed to set profile data', error);
            }
          }
        } catch (error: unknown) {
          console.error('Signup error:', error);
          throw error;
        }
      },
      signIn: async (email: string, password: string) => {
        try {
          const token = await apiLogin(email, password);
          const user = await getProfile(token);
          set({ user, token });
        } catch (error: unknown) {
          console.error('Login error:', error);
          throw error;
        }
      },
      signOut: () => {
        // Reset LaunchDarkly context to anonymous user
        if (ldClientInstance) {
          ldClientInstance.identify(getDefaultContext());
        }
        
        // Clear authentication state
        set({ user: null, token: null });
      },
      updateProfile: async (data: UpdateProfileData) => {
        const { token } = get();
        if (!token) {
          throw new Error('Not authenticated');
        }
        
        try {
          const updatedUser = await updateProfile(token, data);
          set({ user: updatedUser });
        } catch (error: unknown) {
          console.error('Update profile error:', error);
          throw error;
        }
      },
      fetchProfile: async () => {
        const { token } = get();
        if (!token) return; // Not authenticated
        
        set({ isLoading: true });
        
        try {
          const user = await getProfile(token);
          set({ user, isLoading: false });
        } catch (error: unknown) {
          console.error('Fetch profile error:', error);
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token })
    }
  )
);