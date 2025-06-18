import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      setLocation('/login?error=' + error);
      return;
    }

    if (token) {
      // Store the session token
      localStorage.setItem('sessionToken', token);
      // Clear URL parameters and redirect to dashboard
      window.history.replaceState({}, '', '/dashboard');
      setLocation('/dashboard');
    } else {
      // If no token and we're on dashboard route, check localStorage
      const existingToken = localStorage.getItem('sessionToken');
      if (existingToken) {
        setLocation('/dashboard');
      } else {
        setLocation('/login');
      }
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing Authentication</h2>
        <p className="text-gray-600">Setting up your YouTube connection...</p>
      </div>
    </div>
  );
}