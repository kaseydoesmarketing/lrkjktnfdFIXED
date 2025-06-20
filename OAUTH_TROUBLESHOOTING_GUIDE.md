# OAuth Troubleshooting Guide

## Current Issue: redirect_uri_mismatch Error 400

### Problem
Google OAuth is rejecting the redirect URI, showing "Error 400: redirect_uri_mismatch"

### Root Cause
The redirect URI in your Google Cloud Console doesn't match the current Replit domain

### Solution Steps

#### 1. Update Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Click on your OAuth 2.0 Client ID: `618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com`
4. In "Authorized redirect URIs", add this exact URL:
   ```
   https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/api/auth/callback/google
   ```
5. Remove any old/incorrect redirect URIs
6. Click "Save"

#### 2. Verify Configuration
- Current Replit URL: `https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev`
- Required redirect URI: `https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/api/auth/callback/google`
- Client ID: `618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com`

#### 3. Test OAuth Flow
After updating Google Cloud Console:
1. Go to your app's login page
2. Click "Connect with Google (Production)"
3. OAuth should now work without redirect URI errors

### Current Status
- ✅ App published to production
- ✅ OAuth scopes configured
- ✅ Redirect URI configured correctly
- ❌ YouTube scopes require verification (scope justification + demo video)
- ✅ Client ID and Secret configured in Replit

### Production Configuration
**Full YouTube API Scopes Enabled:**
- All required YouTube scopes restored for full functionality
- User is proceeding with Google verification process
- App configured for production use with complete YouTube API access

### Required Scopes for Verification:
- `https://www.googleapis.com/auth/userinfo.email` - User identification
- `https://www.googleapis.com/auth/userinfo.profile` - User profile data
- `https://www.googleapis.com/auth/youtube.readonly` - Read YouTube data
- `https://www.googleapis.com/auth/youtube` - Manage YouTube account
- `https://www.googleapis.com/auth/youtube.force-ssl` - Secure YouTube operations
- `https://www.googleapis.com/auth/yt-analytics.readonly` - YouTube Analytics access

### Next Steps
1. Complete Google verification process with scope justifications
2. Test full OAuth authentication after verification approval
3. Deploy production-ready TitleTesterPro with complete YouTube integration