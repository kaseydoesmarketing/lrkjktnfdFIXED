import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  subscriptionStatus?: string;
  subscriptionTier?: string;
  youtubeChannelId?: string;
  youtubeChannelTitle?: string;
}

interface Account {
  id: string;
  name: string;
  slug: string;
  planType: string;
}

interface AuthState {
  user: User | null;
  currentAccountId: string | null;
  accounts: Account[];
  setUser: (user: User | null) => void;
  setCurrentAccount: (accountId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      currentAccountId: null,
      accounts: [],
      setUser: (user) => set({ user }),
      setCurrentAccount: (accountId) => set({ currentAccountId: accountId }),
      logout: () => set({ user: null, currentAccountId: null, accounts: [] }),
    }),
    {
      name: 'auth-storage',
    }
  )
);