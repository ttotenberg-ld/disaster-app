import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { signUp as apiSignUp, login as apiLogin, getProfile, updateProfile, User, UpdateProfileData } from '../lib/api';

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set: any, get: any) => ({
      user: null,
      token: null,
      isLoading: false,
      signUp: async (email: string, password: string) => {
        try {
          const user = await apiSignUp(email, password);
          // After signup, we need to login to get the token
          const token = await apiLogin(email, password);
          set({ user, token });
        } catch (error) {
          console.error('Signup error:', error);
          throw error;
        }
      },
      signIn: async (email: string, password: string) => {
        try {
          const token = await apiLogin(email, password);
          const user = await getProfile(token);
          set({ user, token });
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },
      signOut: () => {
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
        } catch (error) {
          console.error('Update profile error:', error);
          throw error;
        }
      },
      fetchProfile: async () => {
        const { token, isLoading } = get();
        
        // Skip if no token or already loading
        if (!token || isLoading) {
          return;
        }
        
        set({ isLoading: true });
        
        try {
          const user = await getProfile(token);
          set({ user, isLoading: false });
        } catch (error) {
          console.error('Fetch profile error:', error);
          // If token is invalid, sign out
          set({ user: null, token: null, isLoading: false });
        }
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);