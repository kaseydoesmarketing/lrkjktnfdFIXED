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
            
            // CRITICAL: Fetch YouTube channel data and save tokens BEFORE redirecting
            // Get fresh session to ensure we have provider tokens
            console.log('🔄 [AUTH-CALLBACK] Refreshing session to get provider tokens');
            const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !freshSession) {
              console.error('❌ [AUTH-CALLBACK] Failed to get fresh session:', sessionError);
              setLocation('/login?error=session_error');
              return;
            }
            
            // Get provider tokens from the fresh session or hash parameters
            const providerToken = freshSession.provider_token || hashParams.get('provider_token') || session.provider_token;
            const providerRefreshToken = freshSession.provider_refresh_token || hashParams.get('provider_refresh_token') || session.provider_refresh_token;
            
            console.log('🔑 [AUTH-CALLBACK] Provider tokens status:', {
              hasProviderToken: !!providerToken,
              hasProviderRefreshToken: !!providerRefreshToken,
              sourceFromFreshSession: !!freshSession.provider_token,
              sourceFromHash: !!hashParams.get('provider_token'),
              sourceFromOriginalSession: !!session.provider_token
            });
            
            if (!providerToken) {
              console.error('❌ [AUTH-CALLBACK] No provider tokens available - user may need to re-authorize YouTube scopes');
              
              // Try to extract the Google OAuth code from the URL if available
              const urlParams = new URLSearchParams(window.location.search);
              const googleCode = urlParams.get('code');
              
              if (googleCode) {
                console.log('🔄 [AUTH-CALLBACK] Found Google OAuth code, attempting token exchange');
                // Save minimal user data and redirect to dashboard
                // The dashboard will prompt for YouTube reconnection
                setLocation('/dashboard');
                return;
              }
              
              // No tokens and no code - user denied YouTube permissions
              console.log('⚠️ [AUTH-CALLBACK] User may have denied YouTube permissions');
              setLocation('/login?error=no_youtube_access');
              return;
            }
            
            console.log('📺 [AUTH-CALLBACK] Fetching YouTube channel data');
            try {
              const youtubeResponse = await fetch(
                'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
                {
                  headers: { 'Authorization': `Bearer ${providerToken}` }
                }
              );
              
              if (!youtubeResponse.ok) {
                console.error('❌ [AUTH-CALLBACK] Failed to fetch YouTube channel:', youtubeResponse.status);
                setLocation('/login?error=youtube_fetch_failed');
                return;
              }
              
              const data = await youtubeResponse.json();
              const channel = data.items?.[0];
              
              if (!channel) {
                console.error('❌ [AUTH-CALLBACK] No YouTube channel found');
                setLocation('/login?error=no_youtube_channel');
                return;
              }
              
              console.log('✅ [AUTH-CALLBACK] YouTube channel found:', channel.snippet.title);
              
              // Update user metadata with YouTube channel info
              const { error: updateError } = await supabase.auth.updateUser({
                data: {
                  youtube_channel_id: channel.id,
                  youtube_channel_title: channel.snippet.title,
                  youtube_channel_thumbnail: channel.snippet.thumbnails.default?.url || channel.snippet.thumbnails.medium?.url
                }
              });
              
              if (updateError) {
                console.error('❌ [AUTH-CALLBACK] Failed to update user metadata:', updateError);
              }
              
              // Save tokens to backend - REQUIRED before redirect
              console.log('💾 [AUTH-CALLBACK] Saving YouTube tokens to backend');
              const saveTokensResponse = await fetch('/api/accounts/save-tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  accessToken: providerToken,
                  refreshToken: providerRefreshToken || '',
                  youtubeChannelId: channel.id,
                  youtubeChannelTitle: channel.snippet.title,
                  youtubeChannelThumbnail: channel.snippet.thumbnails.default?.url
                }),
                credentials: 'include'
              });
              
              if (!saveTokensResponse.ok) {
                console.error('❌ [AUTH-CALLBACK] Failed to save YouTube tokens');
                setLocation('/login?error=token_save_failed');
                return;
              }
              
              console.log('✅ [AUTH-CALLBACK] YouTube tokens saved successfully');
              
              // Wait a moment to ensure everything is persisted
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // All data saved successfully - now redirect to dashboard
              console.log('🚀 [AUTH-CALLBACK] All data saved, redirecting to dashboard');
              setLocation('/dashboard');
              
            } catch (error) {
              console.error('❌ [AUTH-CALLBACK] Critical error:', error);
              setLocation('/login?error=auth_failed');
              return;
            }
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