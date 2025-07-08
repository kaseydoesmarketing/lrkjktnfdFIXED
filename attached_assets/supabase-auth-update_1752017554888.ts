// server/routes/auth-supabase.ts - Updated Google OAuth endpoint

router.get('/api/auth/google', async (req: Request, res: Response) => {
  console.log('🚀 [AUTH-GOOGLE] Starting Google OAuth flow');
  console.log('🌍 [AUTH-GOOGLE] Current origin:', req.headers.origin || 'No origin header');
  
  try {
    const origin = process.env.NODE_ENV === 'production' 
      ? 'https://titletesterpro.com'
      : (req.headers.origin || 'http://localhost:5173');
    
    const redirectUrl = `${origin}/api/auth/callback/google`;
    console.log('🔗 [AUTH-GOOGLE] Redirect URL:', redirectUrl);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          // Request YouTube scopes along with basic profile
          scope: 'openid email profile https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly'
        }
      }
    });
    
    if (error) {
      console.error('❌ [AUTH-GOOGLE] OAuth error:', error);
      throw error;
    }
    
    if (data.url) {
      console.log('✅ [AUTH-GOOGLE] Redirecting to Google OAuth');
      res.redirect(data.url);
    } else {
      throw new Error('No redirect URL from Supabase');
    }
    
  } catch (error) {
    console.error('💥 [AUTH-GOOGLE] Error initiating OAuth:', error);
    res.redirect('/login?error=oauth_init_failed');
  }
});

// OAuth callback handler - Updated to properly handle YouTube tokens
router.get('/api/auth/callback/google', async (req: Request, res: Response) => {
  console.log('🔔 [CALLBACK] Google OAuth callback received');
  console.log('📍 [CALLBACK] Full URL:', req.url);
  console.log('❓ [CALLBACK] Query params:', req.query);
  
  const { code, error: oauthError } = req.query;
  
  if (oauthError) {
    console.error('❌ [CALLBACK] OAuth error:', oauthError);
    return res.redirect('/login?error=' + oauthError);
  }
  
  if (!code) {
    console.error('❌ [CALLBACK] No authorization code received');
    return res.redirect('/login?error=no_code');
  }
  
  try {
    console.log('🔐 [CALLBACK] Exchanging code for session');
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code as string);
    
    if (error) {
      console.error('❌ [CALLBACK] Error exchanging code:', error);
      return res.redirect('/login?error=exchange_failed');
    }
    
    if (!data.session) {
      console.error('❌ [CALLBACK] No session returned');
      return res.redirect('/login?error=no_session');
    }
    
    console.log('✅ [CALLBACK] Session created for user:', data.user.email);
    console.log('🎫 [CALLBACK] Provider token present:', !!data.session.provider_token);
    console.log('🔄 [CALLBACK] Provider refresh token present:', !!data.session.provider_refresh_token);
    
    // Set cookies for the session
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
    
    if (data.session.refresh_token) {
      res.cookie('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      });
    }
    
    console.log('🍪 [CALLBACK] Cookies set successfully');
    
    // Create or update user in our database
    let dbUser = await storage.getUserByEmail(data.user.email!);
    
    if (!dbUser) {
      console.log('👤 [CALLBACK] Creating new user:', data.user.email);
      dbUser = await storage.createUser({
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata.full_name || data.user.email!.split('@')[0],
        image: data.user.user_metadata.avatar_url,
        subscriptionTier: 'free',
        subscriptionStatus: 'inactive'
      });
    } else {
      console.log('👤 [CALLBACK] Updating existing user:', data.user.email);
      // Update user's last login
      await storage.updateUser(dbUser.id, {
        lastLogin: new Date()
      });
    }
    
    console.log('✅ [CALLBACK] Authentication complete, redirecting to dashboard');
    
    // Redirect to dashboard
    const redirectUrl = process.env.NODE_ENV === 'production' 
      ? 'https://titletesterpro.com/dashboard'
      : 'http://localhost:5173/dashboard';
      
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('💥 [CALLBACK] Unexpected error:', error);
    res.redirect('/login?error=callback_error');
  }
});