import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Youtube, AlertCircle } from 'lucide-react';
import { requestYouTubeScopes } from '@/lib/supabase';

export default function ConnectYouTubePrompt() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectYouTube = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await requestYouTubeScopes();
    } catch (err: any) {
      console.error('YouTube connection error:', err);
      setError(`Failed to connect YouTube: ${err.message || 'Please try again'}`);
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-800 border-gray-700">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-semibold text-white flex items-center justify-center gap-2">
          <Youtube className="w-6 h-6 text-red-500" />
          Connect YouTube Channel
        </CardTitle>
        <p className="text-gray-400 text-sm">
          To create A/B tests and track performance, we need access to your YouTube channel
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-red-300 text-sm font-medium">Connection Error</p>
              </div>
              <p className="text-red-300/80 text-sm mt-1">{error}</p>
            </div>
          )}
          
          <Button
            onClick={handleConnectYouTube}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            disabled={isLoading}
          >
            <Youtube className="w-4 h-4 mr-2" />
            {isLoading ? 'Connecting...' : 'Connect YouTube Channel'}
          </Button>

          <div className="mt-4 text-xs text-gray-400 text-center">
            <p>This will allow TitleTesterPro to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-left">
              <li>View your YouTube channel and videos</li>
              <li>Update video titles during A/B tests</li>
              <li>Access analytics for performance tracking</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
