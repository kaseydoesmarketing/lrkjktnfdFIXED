import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authType = urlParams.get('auth');
    
    if (authType === 'read_success' || authType === 'write_success') {
      setTimeout(() => {
        setLocation('/dashboard');
      }, 2000);
    }
  }, [setLocation]);

  const urlParams = new URLSearchParams(window.location.search);
  const authType = urlParams.get('auth');
  const error = urlParams.get('error');

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Failed
          </h1>
          <p className="text-gray-600 mb-6">
            There was an error connecting your YouTube account. Please try again.
          </p>
          <button
            onClick={() => setLocation('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (authType === 'read_success' || authType === 'write_success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {authType === 'read_success' ? 'Read Access' : 'Write Access'} Connected!
          </h1>
          <p className="text-gray-600 mb-6">
            Your YouTube account has been successfully connected with {authType === 'read_success' ? 'read' : 'write'} permissions.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Processing Authentication
        </h1>
        <p className="text-gray-600">
          Please wait while we complete the authentication process...
        </p>
      </div>
    </div>
  );
}
