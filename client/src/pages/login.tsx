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
    console.log('🚀 [LOGIN] User clicked Google login button');
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true',
            scope: [
              'openid',
              'email',
              'profile',
              'https://www.googleapis.com/auth/youtube',
              'https://www.googleapis.com/auth/youtube.force-ssl',
              'https://www.googleapis.com/auth/yt-analytics.readonly'
            ].join(' ')
          }
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
            {new URLSearchParams(window.location.search).get('error') === 'oauth_verification' && (
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mt-2">
                <p className="text-yellow-300 text-sm">
                  <strong>OAuth Setup Required:</strong> Your Google Cloud Console OAuth app needs verification or test user setup. 
                  Use demo mode below or contact support.
                </p>
              </div>
            )}
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
                onClick={handleGoogleAuth}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={isLoading}
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
