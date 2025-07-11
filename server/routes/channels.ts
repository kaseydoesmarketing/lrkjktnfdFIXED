import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get channels for current user (from temp storage)
router.get('/api/auth/channels', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    console.log('📺 [CHANNELS] Fetching channels for user:', userId);
    
    const tempTokens = await storage.getTempTokens(userId);
    if (!tempTokens) {
      console.error('❌ [CHANNELS] No temporary tokens found');
      return res.status(404).json({ error: 'No channels found. Please login again.' });
    }
    
    console.log(`✅ [CHANNELS] Found ${tempTokens.channels.length} channels`);
    return res.json({ channels: tempTokens.channels });
  } catch (error) {
    console.error('❌ [CHANNELS] Error fetching channels:', error);
    return res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Save selected channel
router.post('/api/auth/save-channel', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { channelId, channelTitle } = req.body;
    
    console.log('💾 [CHANNELS] Saving channel selection:', { userId, channelId, channelTitle });
    
    if (!channelId || !channelTitle) {
      return res.status(400).json({ error: 'Channel ID and title are required' });
    }
    
    // Get temporary tokens
    const tempTokens = await storage.getTempTokens(userId);
    if (!tempTokens) {
      console.error('❌ [CHANNELS] No temporary tokens found');
      return res.status(400).json({ error: 'Missing temporary tokens' });
    }
    
    // Save to accounts table
    await storage.upsertAccount(userId, {
      accessToken: tempTokens.accessToken,
      refreshToken: tempTokens.refreshToken,
      youtubeChannelId: channelId,
      youtubeChannelTitle: channelTitle,
      expiresAt: tempTokens.expiresAt,
    });
    
    // Update user with channel info
    await storage.updateUserYouTubeTokens(userId, {
      accessToken: tempTokens.accessToken,
      refreshToken: tempTokens.refreshToken,
      youtubeChannelId: channelId,
      youtubeChannelTitle: channelTitle,
    });
    
    // Delete temporary tokens
    await storage.deleteTempTokens(userId);
    
    console.log('✅ [CHANNELS] Channel saved successfully');
    return res.json({ success: true });
  } catch (error) {
    console.error('❌ [CHANNELS] Error saving channel:', error);
    return res.status(500).json({ error: 'Failed to save channel selection' });
  }
});

export default router;