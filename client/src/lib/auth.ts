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
    this.sessionToken = this.getSessionTokenFromCookie();
  }

  private getSessionTokenFromCookie(): string | null {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'session-token') {
        return value;
      }
    }
    return null;
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
    // Check both cookie and localStorage for session token
    const cookieToken = this.getSessionTokenFromCookie();
    const localStorageToken = localStorage.getItem('sessionToken');
    
    // Use localStorage token if available, fallback to cookie
    this.sessionToken = localStorageToken || cookieToken;
    
    if (!this.sessionToken) {
      // For production debugging - don't log tokens in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('No session token found in localStorage or cookies');
    }
    return null;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Authentication failed, clearing tokens');
          this.logout();
          return null;
        }
        throw new Error(`Failed to get user: ${response.status}`);
      }

      const data = await response.json();
      if (process.env.NODE_ENV !== 'production') {
        console.log('User authenticated successfully:', data.email);
      }
      return data;
    } catch (error) {
      console.error('Error getting current user:', error);
      // Only logout on authentication errors, not network errors
      if (error instanceof Error && error.message.includes('401')) {
        this.logout();
      }
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
