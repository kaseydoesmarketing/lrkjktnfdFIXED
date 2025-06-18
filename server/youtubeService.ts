import { google } from 'googleapis';
import { googleAuthService } from './googleAuth';

export class YouTubeService {
  private youtube;

  constructor() {
    this.youtube = google.youtube({ 
      version: 'v3', 
      auth: process.env.YOUTUBE_API_KEY 
    });
  }

  async getChannelVideos(accessToken: string, maxResults: number = 10) {
    const authClient = googleAuthService.createAuthenticatedClient(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: authClient });

    // First get the channel's uploads playlist
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      mine: true
    });

    if (!channelResponse.data.items?.length) {
      throw new Error('No channel found');
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      throw new Error('No uploads playlist found');
    }

    // Get videos from uploads playlist
    const playlistResponse = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults
    });

    if (!playlistResponse.data.items?.length) {
      return [];
    }

    // Get detailed video information
    const videoIds = playlistResponse.data.items.map(item => item.snippet?.resourceId?.videoId).filter(Boolean);
    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: videoIds
    });

    return videosResponse.data.items?.map(video => ({
      id: video.id!,
      title: video.snippet?.title,
      description: video.snippet?.description,
      thumbnail: video.snippet?.thumbnails?.medium?.url,
      publishedAt: video.snippet?.publishedAt,
      viewCount: parseInt(video.statistics?.viewCount || '0'),
      likeCount: parseInt(video.statistics?.likeCount || '0'),
      commentCount: parseInt(video.statistics?.commentCount || '0'),
      duration: video.contentDetails?.duration,
      status: video.snippet?.liveBroadcastContent === 'none' ? 'published' : video.snippet?.liveBroadcastContent
    })) || [];
  }

  async updateVideoTitle(accessToken: string, videoId: string, newTitle: string) {
    const authClient = googleAuthService.createAuthenticatedClient(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: authClient });

    // First get current video data
    const videoResponse = await youtube.videos.list({
      part: ['snippet'],
      id: [videoId]
    });

    if (!videoResponse.data.items?.length) {
      throw new Error('Video not found');
    }

    const currentVideo = videoResponse.data.items[0];
    
    // Update the title
    await youtube.videos.update({
      part: ['snippet'],
      requestBody: {
        id: videoId,
        snippet: {
          ...currentVideo.snippet,
          title: newTitle
        }
      }
    });

    return { success: true, newTitle };
  }

  async getVideoAnalytics(accessToken: string, videoId: string, startDate: string, endDate: string) {
    const authClient = googleAuthService.createAuthenticatedClient(accessToken);
    
    // Note: YouTube Analytics API requires separate setup and permissions
    // For now, we'll use the Data API to get basic statistics
    const youtube = google.youtube({ version: 'v3', auth: authClient });
    
    const response = await youtube.videos.list({
      part: ['statistics'],
      id: [videoId]
    });

    if (!response.data.items?.length) {
      throw new Error('Video not found');
    }

    const stats = response.data.items[0].statistics;
    return {
      views: parseInt(stats?.viewCount || '0'),
      likes: parseInt(stats?.likeCount || '0'),
      comments: parseInt(stats?.commentCount || '0'),
      // Note: CTR and average view duration require YouTube Analytics API
      ctr: 0, // Placeholder - requires Analytics API
      averageViewDuration: 0 // Placeholder - requires Analytics API
    };
  }

  async searchVideos(query: string, maxResults: number = 10) {
    const response = await this.youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults,
      order: 'relevance'
    });

    return response.data.items?.map(item => ({
      id: item.id?.videoId!,
      title: item.snippet?.title,
      description: item.snippet?.description,
      thumbnail: item.snippet?.thumbnails?.medium?.url,
      publishedAt: item.snippet?.publishedAt,
      channelTitle: item.snippet?.channelTitle
    })) || [];
  }

  extractVideoIdFromUrl(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}

export const youtubeService = new YouTubeService();