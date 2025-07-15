import { queryClient } from './queryClient';
import { useAuthStore } from '@/stores/authStore';

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  subscriptionStatus?: string;
  subscriptionTier?: string;
  youtubeChannelId?: string;
  youtubeChannelTitle?: string;
}

class AuthService {
  constructor() {
    // Remove localStorage dependency - use cookies only
  }


  async loginWithGoogle(credentials: {
    email: string;
    name: string;
    image?: string;
    accessToken: string;
    refreshToken?: string;
  }) {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include', // Always include cookies
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    return data.user;
  }

  async logout(): Promise<void> {
    try {
      console.log('🚪 [AuthService] Logging out...');
      
      const { supabase } = await import('./supabase');
      await supabase.auth.signOut();
      
      console.log('✅ [AuthService] Logout successful');
      
      // Clear any cached data
      queryClient.clear();
      
      // Clear any localStorage data (cleanup)
      localStorage.removeItem('sessionToken');
    } catch (error) {
      console.error('❌ [AuthService] Logout failed:', error);
      const { supabase } = await import('./supabase');
      await supabase.auth.signOut();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    console.log('🔍 [AUTH-SERVICE] Getting current user');
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include', // Always use cookie-based authentication
      });

      console.log('📡 [AUTH-SERVICE] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [AUTH-SERVICE] User found:', data.user?.email);
        return data.user;
      }
      
      // Log the error for debugging
      if (response.status === 401) {
        console.log('❌ [AUTH-SERVICE] User not authenticated or session expired');
      } else {
        console.error('❌ [AUTH-SERVICE] Auth check failed:', response.status, response.statusText);
      }
      
      // No valid authentication found
      return null;
    } catch (error) {
      console.error('💥 [AUTH-SERVICE] Error getting current user:', error);
      return null;
    }
  }

  async demoLogin(): Promise<User> {
    const response = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Demo login failed');
    }

    const data = await response.json();
    
    if (!data.user) {
      console.error('No user data in response:', data);
      throw new Error('No user data received');
    }
    
    console.log('Demo login successful');
    return data.user;
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      console.log('🔍 [AuthService] Checking Supabase auth status...');
      
      const { supabase } = await import('./supabase');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.log('🔍 [AuthService] No Supabase user found');
        return false;
      }

      console.log('🔍 [AuthService] Supabase user found, checking with server...');
      
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });

      const isAuth = response.ok;
      console.log('🔍 [AuthService] Server auth check result:', isAuth);
      return isAuth;
    } catch (error) {
      console.error('🔍 [AuthService] Auth check failed:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
