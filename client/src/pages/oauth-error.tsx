import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ExternalLink } from 'lucide-react';

export default function OAuthError() {
  const [, setLocation] = useLocation();
  const [errorType, setErrorType] = useState('unknown');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error') || 'unknown';
    setErrorType(error);
  }, []);

  const errorMessages = {
    missing_code: {
      title: 'OAuth Code Missing',
      description: 'The authentication process was incomplete. Please try logging in again.',
    },
    exchange_failed: {
      title: 'Authentication Failed',
      description: 'We couldn\'t verify your Google account. Please try again.',
    },
    token_exchange_failed: {
      title: 'Token Exchange Failed',
      description: 'Failed to retrieve your Google authentication tokens. Please try again.',
    },
    missing_tokens: {
      title: 'Missing Authentication Tokens',
      description: 'We couldn\'t retrieve the necessary permissions from Google.',
    },
    no_channels: {
      title: 'No YouTube Channel Found',
      description: 'No YouTube channel is associated with this Google account. Please use an account with a YouTube channel.',
    },
    internal_error: {
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred during authentication. Please try again.',
    },
    unknown: {
      title: 'Authentication Error',
      description: 'Something went wrong while connecting your account.',
    },
  };

  const error = errorMessages[errorType as keyof typeof errorMessages] || errorMessages.unknown;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">😕 YouTube Connection Error</CardTitle>
            <CardDescription className="text-lg mt-2">{error.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-600 text-center">
              {error.description}
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="font-semibold mb-3">This may happen if:</p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Permissions were denied or expired
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  You previously revoked access to TitleTesterPro
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Your Google account doesn't have a YouTube channel
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-lg p-6">
              <p className="font-semibold mb-3">To fix this:</p>
              <ol className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="mr-2 font-semibold">1.</span>
                  <div>
                    Go to{' '}
                    <a 
                      href="https://myaccount.google.com/permissions" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center"
                    >
                      Google Account Permissions
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 font-semibold">2.</span>
                  Remove <strong>TitleTesterPro</strong> if it appears in the list
                </li>
                <li className="flex items-start">
                  <span className="mr-2 font-semibold">3.</span>
                  Come back and log in again with the correct account
                </li>
              </ol>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <Button 
                onClick={() => setLocation('/login')}
                size="lg"
              >
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/')}
                size="lg"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}