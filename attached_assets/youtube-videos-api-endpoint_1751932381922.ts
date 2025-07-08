// Add this to your server/routes.ts file

router.get('/api/videos/channel', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const account = await storage.getAccountByUserId(userId);
    
    if (!account || !account.accessToken) {
      return res.status(401).json({ error: 'YouTube account not connected' });
    }

    // Initialize YouTube service with user's tokens
    const youtube = google.youtube({
      version: 'v3',
      auth: new google.auth.OAuth2({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
      }),
    });

    // Get user's channel
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      mine: true,
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) {
      return res.status(404).json({ error: 'No YouTube channel found' });
    }

    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

    // Get videos from uploads playlist
    const videosResponse = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults: 50, // Adjust as needed
    });

    // Get additional video details including statistics
    const videoIds = videosResponse.data.items.map(item => item.contentDetails.videoId);
    
    const videoDetailsResponse = await youtube.videos.list({
      part: ['statistics', 'contentDetails', 'snippet'],
      id: videoIds,
    });

    // Format the response
    const videos = videoDetailsResponse.data.items.map(video => {
      const snippet = video.snippet;
      const statistics = video.statistics;
      const contentDetails = video.contentDetails;

      return {
        id: video.id,
        videoId: video.id,
        title: snippet.title,
        description: snippet.description,
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url,
        publishedAt: snippet.publishedAt,
        duration: contentDetails.duration,
        viewCount: parseInt(statistics.viewCount || '0'),
        likeCount: parseInt(statistics.likeCount || '0'),
        commentCount: parseInt(statistics.commentCount || '0'),
        // Add analytics if available from your database
        analytics: {
          ctr: null, // You can fetch this from YouTube Analytics API if needed
          score: null, // AI score if you have it
        }
      };
    });

    // Sort by most recent first
    videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    res.json(videos);
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    
    // Handle token refresh if needed
    if (error.response?.status === 401) {
      // Token might be expired, handle refresh logic here
      return res.status(401).json({ error: 'Authentication expired. Please reconnect your YouTube account.' });
    }
    
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Optional: Add endpoint to fetch more videos with pagination
router.get('/api/videos/channel/more', requireAuth, async (req, res) => {
  const { pageToken } = req.query;
  
  try {
    // Similar logic as above but with pageToken for pagination
    // youtube.playlistItems.list({ pageToken, ... })
    
    res.json({ videos: [], nextPageToken: null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch more videos' });
  }
});