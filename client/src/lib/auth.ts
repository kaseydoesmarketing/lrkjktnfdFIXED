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
    try {
      // Always use credentials: 'include' to send cookies
      // Try cookie-based authentication first (production OAuth)
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV !== 'production') {
          console.log('User authenticated via cookie:', data.email);
        }
        return data;
      }
      
      // If cookie auth fails, try localStorage token (demo mode)
      const localStorageToken = localStorage.getItem('sessionToken');
      if (localStorageToken) {
        const tokenResponse = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${localStorageToken}`,
          },
          credentials: 'include',
        });

        if (tokenResponse.ok) {
          const data = await tokenResponse.json();
          if (process.env.NODE_ENV !== 'production') {
            console.log('User authenticated via localStorage token:', data.email);
          }
          return data;
        }
      }

      // No valid authentication found
      if (process.env.NODE_ENV !== 'production') {
        console.log('No valid authentication found');
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
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
