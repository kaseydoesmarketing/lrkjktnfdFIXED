# TitleTesterPro - Google OAuth Setup Guide

## Current Issue
The OAuth authentication isn't working because Google OAuth needs to be configured in your Supabase dashboard.

## Understanding YouTube Login
**Important**: YouTube doesn't have a separate login system - it uses Google accounts. When users log in with Google, they automatically get YouTube access if their Google account has a YouTube channel.

## Setup Steps

### 1. Configure Google OAuth in Supabase Dashboard

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/xyehwoacgpsxakhjwglq
2. Navigate to **Authentication** → **Providers** → **Google**
3. Enable Google provider
4. You'll need to add:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)

### 2. Create Google OAuth App (if not already done)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **YouTube Data API v3** and **YouTube Analytics API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen:
   - Add your app name (TitleTesterPro)
   - Add authorized domains
   - Add required scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/youtube`
     - `https://www.googleapis.com/auth/yt-analytics.readonly`

### 3. Configure Redirect URIs

Add these authorized redirect URIs in Google Cloud Console:
```
https://xyehwoacgpsxakhjwglq.supabase.co/auth/v1/callback
```

### 4. Add OAuth Credentials to Supabase

1. Copy the **Client ID** and **Client Secret** from Google Cloud Console
2. Paste them in Supabase Authentication settings
3. Save the configuration

### 5. Update Environment Variables (Optional)

If you need direct Google API access for server-side operations, add these to your `.env`:
```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## How It Works

1. **Phase 1**: User clicks "Sign in with Google" → Basic login (email, profile)
2. **Phase 2**: When user needs YouTube access → Requests YouTube permissions
3. **Channel Selection**: If user has multiple YouTube channels → Select one
4. **Active Tests**: User can now create and manage A/B tests

## Troubleshooting

### "OAuth not working"
- Check if Google provider is enabled in Supabase
- Verify Client ID and Secret are correctly entered
- Ensure redirect URI matches exactly

### "No YouTube channel found"
- User's Google account doesn't have a YouTube channel
- User needs to create a YouTube channel first

### "Permission denied"
- User declined YouTube permissions
- User needs to approve all requested scopes

## Quick Test

After setup, test the flow:
1. Go to your app's login page
2. Click "Sign in with Google"
3. Should redirect to Google OAuth
4. After approval, should return to your app
5. Dashboard should show "Connect YouTube Channel" prompt
6. Click to connect YouTube
7. Should see channel selection if multiple channels exist

## Alternative Approach?

There's no "YouTube-specific login" - YouTube IS Google. The current implementation is the standard approach used by all YouTube apps (TubeBuddy, VidIQ, etc.).

If you're still having issues after this setup, please share:
1. What error message you see
2. At which step the flow breaks
3. Browser console errors

This will help me fix the specific issue you're facing.