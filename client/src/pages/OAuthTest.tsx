import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function OAuthTest() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'GET',
        credentials: 'include'
      });
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      setError('Logout failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">OAuth Authentication Test</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {user ? (
              <div>
                <p className="text-green-600 font-semibold mb-4">✓ Authenticated</p>
                <div className="space-y-2">
                  <p><strong>ID:</strong> {user.id}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Name:</strong> {user.name || 'Not provided'}</p>
                  <p><strong>YouTube Channel:</strong> {user.youtubeChannelTitle || 'Not connected'}</p>
                  <p><strong>Subscription:</strong> {user.subscriptionTier || 'Free'} ({user.subscriptionStatus || 'Inactive'})</p>
                </div>
                <Button 
                  onClick={handleLogout}
                  className="mt-4"
                  variant="destructive"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">Not authenticated</p>
                <Button 
                  onClick={handleLogin}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Login with Google
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OAuth Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Client ID:</strong> 618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com</p>
              <p><strong>Redirect URI:</strong> /api/auth/callback/google</p>
              <p><strong>Scopes:</strong> profile, email, youtube.readonly, youtube, yt-analytics.readonly</p>
              <p><strong>Implementation:</strong> Passport.js with express-session</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}