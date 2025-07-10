import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('🎯 [AUTH-CALLBACK] Starting auth callback processing');
      console.log('📍 [AUTH-CALLBACK] Current URL:', window.location.href);
      
      try {
        // Check for error in query params first
        const urlParams = new URLSearchParams(window.location.search);
        const queryError = urlParams.get('error');
        console.log('❓ [AUTH-CALLBACK] Query params:', Object.fromEntries(urlParams.entries()));
        
        if (queryError) {
          console.error('❌ [AUTH-CALLBACK] OAuth error:', queryError);
          setLocation('/login?error=' + queryError);
          return;
        }

        // Get the session from the URL hash (Supabase returns tokens as hash fragments)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        console.log('🔑 [AUTH-CALLBACK] Hash params found:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          allHashParams: Object.fromEntries(hashParams.entries())
        });
        
        if (accessToken) {
          console.log('🔐 [AUTH-CALLBACK] Setting session with access token');
          // Set the session in Supabase client
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (error) {
            console.error('❌ [AUTH-CALLBACK] Error setting session:', error);
            setLocation('/login?error=session_error');
            return;
          }

          if (session) {
            console.log('✅ [AUTH-CALLBACK] Session established successfully:', {
              user: session.user.email,
              expiresAt: new Date(session.expires_at! * 1000).toISOString()
            });
            
            // Set httpOnly cookies on the backend
            console.log('🍪 [AUTH-CALLBACK] Setting backend cookies');
            const cookieResponse = await fetch('/api/auth/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken
              }),
              credentials: 'include'
            });
            
            if (!cookieResponse.ok) {
              console.error('❌ [AUTH-CALLBACK] Failed to set backend cookies');
              setLocation('/login?error=cookie_error');
              return;
            }
            
            console.log('✅ [AUTH-CALLBACK] Backend cookies set successfully');
            
            // Clear the hash from URL
            window.history.replaceState({}, '', window.location.pathname);
            // Redirect to dashboard
            console.log('🚀 [AUTH-CALLBACK] Redirecting to dashboard');
            setLocation('/dashboard');
          }
        } else {
          console.log('🔍 [AUTH-CALLBACK] No access token in hash, checking existing session');
          // Check if we already have a session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session) {
            console.log('✅ [AUTH-CALLBACK] Existing session found:', session.user.email);
            setLocation('/dashboard');
          } else {
            console.log('❌ [AUTH-CALLBACK] No session found, redirecting to login');
            setLocation('/login');
          }
        }
      } catch (error) {
        console.error('💥 [AUTH-CALLBACK] Auth callback error:', error);
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