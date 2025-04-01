import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = {
  id: string;
  email: string;
  fullName?: string;
  username?: string;
  website?: string;
};

type AuthState = {
  user: User | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (data: Partial<User>) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signUp: async (email, password) => {
        // In a real app, you'd hash the password and make an API call
        const newUser = {
          id: Math.random().toString(36).substring(2),
          email,
        };
        set({ user: newUser });
      },
      signIn: async (email, password) => {
        // In a real app, you'd verify credentials against an API
        const user = {
          id: Math.random().toString(36).substring(2),
          email,
        };
        set({ user });
      },
      signOut: () => {
        set({ user: null });
      },
      updateProfile: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);