// Add this to your server/routes/auth-supabase.ts or create a new route file

// YouTube connection status check endpoint
router.get('/api/auth/youtube-status', requireAuth, async (req: Request, res: Response) => {
  console.log('🔍 [YOUTUBE-STATUS] Checking YouTube connection status');
  
  try {
    const userId = req.user!.id;
    
    // Try to make a simple YouTube API call to verify the connection
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return res.status(401).json({ 
        connected: false, 
        error: 'No active session' 
      });
    }
    
    // Check if we have provider tokens
    const hasProviderToken = !!session.provider_token;
    const hasRefreshToken = !!session.provider_refresh_token;
    
    if (!hasProviderToken) {
      return res.status(401).json({ 
        connected: false, 
        error: 'No YouTube authorization found. Please reconnect your account.',
        details: {
          hasProviderToken,
          hasRefreshToken,
          hint: 'You may need to sign out and sign in again with YouTube permissions'
        }
      });
    }
    
    // Try a simple API call to verify the token works
    try {
      const testResponse = await youtubeService.getChannelVideos(userId, 1);
      
      res.json({
        connected: true,
        message: 'YouTube API is connected and working',
        details: {
          hasProviderToken,
          hasRefreshToken,
          testSuccessful: true
        }
      });
    } catch (apiError: any) {
      res.status(401).json({
        connected: false,
        error: 'YouTube API call failed',
        details: {
          hasProviderToken,
          hasRefreshToken,
          apiError: apiError.message
        }
      });
    }
    
  } catch (error) {
    console.error('❌ [YOUTUBE-STATUS] Error checking status:', error);
    res.status(500).json({ 
      connected: false, 
      error: 'Failed to check YouTube status' 
    });
  }
});