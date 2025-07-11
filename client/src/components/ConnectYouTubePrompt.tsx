import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Youtube, Shield, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ConnectYouTubePrompt() {
  const [loading, setLoading] = useState(false);

  const handleConnectYouTube = async () => {
    console.log('🚀 [CONNECT_YOUTUBE] Phase 2 - Requesting YouTube permissions');
    setLoading(true);
    try {
      // Phase 2: YouTube connection with incremental consent
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          scopes: [
            'openid',
            'email', 
            'profile',
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/yt-analytics.readonly'
          ].join(' '),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true' // Enable incremental consent
          }
        }
      });

      if (error) {
        console.error('OAuth error:', error);
      }
    } catch (error) {
      console.error('Failed to initiate YouTube connection:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Youtube className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-3xl">Connect Your YouTube Channel</CardTitle>
            <CardDescription className="text-lg mt-2">
              To start testing your titles, we need access to your YouTube channel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold mb-3">What we'll access:</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Shield className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                  <div>
                    <strong>View your YouTube channel</strong>
                    <p className="text-sm text-gray-600">To display your videos and channel info</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                  <div>
                    <strong>Manage your YouTube videos</strong>
                    <p className="text-sm text-gray-600">To update video titles during A/B tests</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                  <div>
                    <strong>View YouTube Analytics</strong>
                    <p className="text-sm text-gray-600">To track performance metrics for your tests</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold mb-2">🔒 Your data is secure</h3>
              <p className="text-sm text-gray-600">
                We use industry-standard encryption to protect your credentials. 
                You can revoke access at any time from your Google account settings.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleConnectYouTube}
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Youtube className="w-5 h-5 mr-2" />
                    Connect YouTube Channel
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-gray-500">
                By connecting, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}