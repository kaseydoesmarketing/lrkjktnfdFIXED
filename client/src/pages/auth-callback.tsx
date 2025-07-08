import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error in query params first
        const urlParams = new URLSearchParams(window.location.search);
        const queryError = urlParams.get('error');
        
        if (queryError) {
          console.error('OAuth error:', queryError);
          setLocation('/login?error=' + queryError);
          return;
        }

        // Get the session from the URL hash (Supabase returns tokens as hash fragments)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
          // Set the session in Supabase client
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (error) {
            console.error('Error setting session:', error);
            setLocation('/login?error=session_error');
            return;
          }

          if (session) {
            console.log('✅ Session established successfully');
            // Clear the hash from URL
            window.history.replaceState({}, '', window.location.pathname);
            // Redirect to dashboard
            setLocation('/dashboard');
          }
        } else {
          // Check if we already have a session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session) {
            console.log('✅ Existing session found');
            setLocation('/dashboard');
          } else {
            console.log('❌ No session found, redirecting to login');
            setLocation('/login');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setLocation('/login?error=callback_error');
      }
    };

    handleAuthCallback();
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