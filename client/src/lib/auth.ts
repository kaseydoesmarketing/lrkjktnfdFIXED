import { queryClient } from './queryClient';

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

class AuthService {
  private sessionToken: string | null = null;

  constructor() {
    this.sessionToken = localStorage.getItem('sessionToken');
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
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    this.sessionToken = data.sessionToken;
    localStorage.setItem('sessionToken', data.sessionToken);
    
    return data.user;
  }

  async logout() {
    if (this.sessionToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
        },
      });
    }
    
    this.sessionToken = null;
    localStorage.removeItem('sessionToken');
    queryClient.clear();
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.sessionToken) return null;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
          return null;
        }
        throw new Error('Failed to get user');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error getting current user:', error);
      // Don't logout on network errors, only on auth errors
      return null;
    }
  }

  async demoLogin(): Promise<User> {
    const response = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Demo login failed');
    }

    const data = await response.json();
    
    // Check if we have a sessionToken in the response
    if (!data.sessionToken) {
      console.error('No sessionToken in response:', data);
      throw new Error('No session token received');
    }
    
    this.sessionToken = data.sessionToken;
    localStorage.setItem('sessionToken', data.sessionToken);
    
    console.log('Demo login successful, token stored:', data.sessionToken);
    return data.user;
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }

  isAuthenticated(): boolean {
    return !!this.sessionToken;
  }
}

export const authService = new AuthService();
