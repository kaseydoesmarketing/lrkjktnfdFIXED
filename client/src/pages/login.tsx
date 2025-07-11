import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Youtube, BarChart3, TrendingUp, TestTube, AlertCircle } from 'lucide-react';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    // Check for error parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const descriptionParam = urlParams.get('description');
    const founderParam = urlParams.get('founder');
    
    if (errorParam) {
      console.log('Login error detected:', errorParam, descriptionParam);
      setError(descriptionParam || `Authentication error: ${errorParam}`);
    }
    

  }, []);

  const handleGoogleAuth = async () => {
    console.log('🚀 [LOGIN] Phase 1 - Basic Google login');
    setIsLoading(true);
    setError(null);
    
    try {
      // Phase 1: Basic login with minimal scopes
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile' // Basic scopes only for initial login
        }
      });
      
      if (error) {
        console.error('OAuth error:', error);
        setError('Failed to initiate login. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };





  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Features */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                <Youtube className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">TitleTesterPro</h1>
                <p className="text-gray-400">Optimize your YouTube titles with data-driven A/B testing</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <TestTube className="text-blue-400 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Automated A/B Testing</h3>
                <p className="text-gray-400 text-sm">Test multiple title variants automatically with customizable rotation intervals</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="text-green-400 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Real-time Analytics</h3>
                <p className="text-gray-400 text-sm">Track CTR, views, and engagement metrics to identify winning titles</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="text-purple-400 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Performance Optimization</h3>
                <p className="text-gray-400 text-sm">Increase click-through rates and video performance with data-backed decisions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <Card className="w-full max-w-md mx-auto bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold text-white">Connect Your YouTube Account</CardTitle>
            <p className="text-gray-400 text-sm">Start optimizing your video titles today</p>
            {(() => {
              const errorParam = new URLSearchParams(window.location.search).get('error');
              const errorMessages: { [key: string]: string } = {
                'oauth_verification': 'OAuth Setup Required: Your Google Cloud Console OAuth app needs verification or test user setup.',
                'no_youtube_access': 'YouTube access not granted. Please allow YouTube permissions during sign-in.',
                'youtube_fetch_failed': 'Failed to fetch YouTube channel data. Please try signing in again.',
                'no_youtube_channel': 'No YouTube channel found for this account. Please ensure you have a YouTube channel.',
                'token_save_failed': 'Failed to save authentication tokens. Please try signing in again.',
                'auth_failed': 'Authentication failed. Please try signing in again.',
                'cookie_error': 'Failed to set authentication cookies. Please enable cookies and try again.',
                'session_error': 'Failed to establish session. Please try signing in again.'
              };
              
              if (errorParam && errorMessages[errorParam]) {
                return (
                  <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mt-2">
                    <p className="text-yellow-300 text-sm">{errorMessages[errorParam]}</p>
                  </div>
                );
              }
              return null;
            })()}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <p className="text-red-300 text-sm font-medium">Authentication Error</p>
                  </div>
                  <p className="text-red-300/80 text-sm mt-1">{error}</p>
                </div>
              )}
              
              <Button
                id="google-signin"
                name="google-signin"
                onClick={handleGoogleAuth}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={isLoading}
                aria-label="Sign in with Google to connect your YouTube account"
              >
                <Youtube className="w-4 h-4 mr-2" />
                {isLoading ? 'Connecting...' : 'Connect with Google'}
              </Button>





            </div>

            
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-400 text-center">
                By using TitleTesterPro, you agree to our{' '}
                <a href="/terms" className="text-blue-400 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
