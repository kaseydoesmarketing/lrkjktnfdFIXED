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
        const errorDescription = urlParams.get('error_description');
        
        if (queryError) {
          console.error('❌ [AUTH-CALLBACK] OAuth error:', queryError, errorDescription);
          setLocation(`/login?error=${queryError}&description=${encodeURIComponent(errorDescription || '')}`);
          return;
        }

        // Let Supabase handle the OAuth callback
        console.log('🔐 [AUTH-CALLBACK] Processing Supabase auth callback');
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (error) {
          console.error('❌ [AUTH-CALLBACK] Error exchanging code for session:', error);
          setLocation('/login?error=session_error');
          return;
        }

        if (data?.session) {
          console.log('✅ [AUTH-CALLBACK] Session established successfully:', {
            user: data.session.user.email,
            expiresAt: new Date(data.session.expires_at! * 1000).toISOString()
          });
          
          // User creation happens automatically in the auth middleware
          console.log('✅ [AUTH-CALLBACK] Session established, user will be created on first API call');
          
          console.log('📺 [AUTH-CALLBACK] Redirecting to dashboard');
          
          // Small delay to ensure everything is set up
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setLocation('/dashboard');
        } else {
          console.log('❌ [AUTH-CALLBACK] No session returned from Supabase');
          setLocation('/login?error=no_session');
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