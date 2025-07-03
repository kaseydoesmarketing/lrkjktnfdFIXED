# OAuth Scopes Documentation for TitleTesterPro

## Overview
TitleTesterPro implements Google OAuth 2.0 with incremental authorization and follows the principle of least privilege. This document details each scope required by the application and its specific use case.

## OAuth Configuration

### Authorization URL Parameters
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com
  &redirect_uri=YOUR_REDIRECT_URI
  &response_type=code
  &scope=SCOPES_LISTED_BELOW
  &include_granted_scopes=true    // INCREMENTAL AUTHORIZATION ENABLED
  &access_type=offline            // FOR REFRESH TOKENS
```

## Required OAuth Scopes

### 1. User Authentication Scopes (Basic Access)

#### `https://www.googleapis.com/auth/userinfo.email`
- **Purpose**: Retrieve user's email address
- **Feature**: Account creation and identification
- **API Endpoints Used**: 
  - `oauth2.userinfo.get()` in `googleAuth.ts:getUserInfo()`
- **Data Accessed**: User's email address only
- **Business Justification**: Required to create user accounts and identify returning users

#### `https://www.googleapis.com/auth/userinfo.profile`
- **Purpose**: Retrieve user's basic profile information
- **Feature**: Personalized dashboard display
- **API Endpoints Used**: 
  - `oauth2.userinfo.get()` in `googleAuth.ts:getUserInfo()`
- **Data Accessed**: User's name and profile picture
- **Business Justification**: Provides personalized experience showing user's name and avatar

### 2. YouTube Data Access Scopes

#### `https://www.googleapis.com/auth/youtube.readonly`
- **Purpose**: Read access to user's YouTube channel and videos
- **Feature**: Video selection for A/B testing
- **API Endpoints Used**:
  - `youtube.channels.list()` - Get channel information
  - `youtube.playlistItems.list()` - Get user's uploaded videos
  - `youtube.videos.list()` - Get detailed video information
- **Functions Using This Scope**:
  - `youtubeService.ts:getChannelVideos()` - Display user's videos for test creation
  - `youtubeService.ts:getVideoAnalytics()` - Fallback for basic video statistics
- **Data Accessed**: 
  - Video titles, descriptions, thumbnails
  - View counts, like counts, comment counts
  - Video duration and publish dates
- **Business Justification**: Users must select their existing videos to create A/B tests

#### `https://www.googleapis.com/auth/youtube`
- **Purpose**: Write access to update video metadata
- **Feature**: Automated title rotation during A/B tests
- **API Endpoints Used**:
  - `youtube.videos.update()` - Update video title only
- **Functions Using This Scope**:
  - `youtubeService.ts:updateVideoTitle()` - Core A/B testing functionality
- **Data Modified**: 
  - Video title field ONLY
  - No changes to descriptions, tags, thumbnails, or other metadata
- **Business Justification**: 
  - Core service functionality - automated title A/B testing
  - YouTube API does not provide a more granular scope for title-only updates
  - Users explicitly schedule and control when title changes occur

### 3. Analytics Scope

#### `https://www.googleapis.com/auth/yt-analytics.readonly`
- **Purpose**: Access detailed video performance analytics
- **Feature**: A/B test performance measurement
- **API Endpoints Used**:
  - `youtubeAnalytics.reports.query()` - Get detailed metrics
- **Functions Using This Scope**:
  - `youtubeService.ts:getVideoAnalytics()` - Track test performance
- **Data Accessed**:
  - Video impressions
  - Click-through rate (CTR)
  - Average view duration
  - Views per day during test periods
- **Business Justification**: 
  - Essential for determining winning titles based on performance data
  - Provides accurate CTR calculations: (Views / Impressions) × 100
  - Enables data-driven decision making for content optimization

## Incremental Authorization Implementation

The application implements incremental authorization by including `include_granted_scopes=true` in all OAuth requests. This allows:

1. **Initial Authorization**: Users grant basic profile access
2. **Feature-Based Expansion**: Additional scopes requested when users access specific features
3. **Transparent Consent**: Users understand exactly what permissions are needed for each feature

## Security Considerations

1. **Removed Redundant Scopes**: 
   - Eliminated `youtube.force-ssl` as HTTPS is enforced by default
   - All API communications use secure connections

2. **Token Storage**: 
   - Access tokens encrypted using AES-256-CBC before database storage
   - Refresh tokens stored securely for background operations

3. **Minimal Access Principle**: 
   - Only request scopes needed for active features
   - No broad data access beyond specific A/B testing needs

## Compliance with Google's OAuth Policy

1. **Clear Value Proposition**: Each scope directly enables a user-facing feature
2. **Minimal Data Access**: Only access data required for A/B testing functionality
3. **User Control**: Users explicitly create and schedule tests
4. **Transparent Operations**: All title changes occur during user-defined test periods

## OAuth Flow Implementation Details

### File: `server/googleAuth.ts` (Lines 50-85)
```typescript
getAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/yt-analytics.readonly'
  ];
  
  const authUrl = this.oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes.join(' '),
    prompt: 'consent',
    include_granted_scopes: true,  // INCREMENTAL AUTHORIZATION
    response_type: 'code'
  });
}
```

## Summary

TitleTesterPro uses the minimum required OAuth scopes to deliver its core value proposition: automated YouTube title A/B testing with data-driven insights. Each scope maps directly to essential functionality, ensuring compliance with Google's OAuth policies while providing a secure, transparent service to content creators.