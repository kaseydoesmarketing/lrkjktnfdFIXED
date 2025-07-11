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
            
            // CRITICAL: Persist YouTube tokens from Supabase session
            console.log('💾 [AUTH-CALLBACK] Persisting YouTube tokens');
            
            // Get the fresh session with provider tokens
            const { data: { session: freshSession } } = await supabase.auth.getSession();
            
            if (freshSession?.provider_token && freshSession?.provider_refresh_token) {
              console.log('🔑 [AUTH-CALLBACK] Found provider tokens, saving to backend');
              
              // Fetch YouTube channel data
              try {
                console.log('📺 [AUTH-CALLBACK] Fetching YouTube channel data');
                const channelResponse = await fetch(
                  'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
                  {
                    headers: { 'Authorization': `Bearer ${freshSession.provider_token}` }
                  }
                );
                
                const channelData = await channelResponse.json();
                const channel = channelData.items?.[0];
                
                if (channel) {
                  console.log('✅ [AUTH-CALLBACK] YouTube channel found:', channel.snippet.title);
                  
                  // Update user metadata with YouTube channel info
                  await supabase.auth.updateUser({
                    data: {
                      youtube_channel_id: channel.id,
                      youtube_channel_title: channel.snippet.title,
                      youtube_channel_thumbnail: channel.snippet.thumbnails.default?.url
                    }
                  });
                  
                  // Save tokens with YouTube channel data to backend
                  const tokenResponse = await fetch('/api/accounts/save-tokens', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      accessToken: freshSession.provider_token,
                      refreshToken: freshSession.provider_refresh_token,
                      youtubeChannelId: channel.id,
                      youtubeChannelTitle: channel.snippet.title,
                      youtubeChannelThumbnail: channel.snippet.thumbnails.default?.url
                    }),
                    credentials: 'include'
                  });
                  
                  if (!tokenResponse.ok) {
                    console.error('❌ [AUTH-CALLBACK] Failed to persist YouTube tokens');
                  } else {
                    console.log('✅ [AUTH-CALLBACK] YouTube tokens and channel data persisted successfully');
                  }
                } else {
                  console.warn('⚠️ [AUTH-CALLBACK] No YouTube channel found');
                  
                  // Still save tokens even without channel data
                  const tokenResponse = await fetch('/api/accounts/save-tokens', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      accessToken: freshSession.provider_token,
                      refreshToken: freshSession.provider_refresh_token,
                    }),
                    credentials: 'include'
                  });
                  
                  if (!tokenResponse.ok) {
                    console.error('❌ [AUTH-CALLBACK] Failed to persist YouTube tokens');
                  } else {
                    console.log('✅ [AUTH-CALLBACK] YouTube tokens persisted successfully');
                  }
                }
              } catch (error) {
                console.error('❌ [AUTH-CALLBACK] YouTube fetch error:', error);
                
                // Still save tokens even if YouTube fetch fails
                const tokenResponse = await fetch('/api/accounts/save-tokens', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    accessToken: freshSession.provider_token,
                    refreshToken: freshSession.provider_refresh_token,
                  }),
                  credentials: 'include'
                });
                
                if (!tokenResponse.ok) {
                  console.error('❌ [AUTH-CALLBACK] Failed to persist YouTube tokens');
                } else {
                  console.log('✅ [AUTH-CALLBACK] YouTube tokens persisted successfully');
                }
              }
            } else {
              console.warn('⚠️ [AUTH-CALLBACK] No provider tokens found in session');
            }
            
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