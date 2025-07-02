# TITLETESTERPRO.COM PRODUCTION OAUTH SETUP - COMPLETE GUIDE

## Critical: Google Cloud Console Configuration Required

Your OAuth needs to support BOTH domains. Currently it only works on the development Replit domain.

### Step 1: Update OAuth Redirect URIs in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Edit OAuth 2.0 Client ID: `618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com`
4. Add BOTH redirect URIs:

```
https://titletesterpro.com/api/auth/callback/google
https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/api/auth/callback/google
```

### Step 2: Verify OAuth Consent Screen Settings

Ensure these URLs are configured:
- **Application Homepage**: https://titletesterpro.com
- **Privacy Policy**: https://titletesterpro.com/privacy  
- **Terms of Service**: https://titletesterpro.com/terms

### Step 3: Deploy to Production Domain

The code is already configured to handle both environments automatically. When deployed to titletesterpro.com, it will:
- Use production redirect URI: `https://titletesterpro.com/api/auth/callback/google`
- Handle OAuth authentication seamlessly
- Provide YouTube API integration with fresh tokens

### Step 4: Test Production OAuth

After updating Google Cloud Console:
1. Visit https://titletesterpro.com/
2. Click "Sign in with Google"
3. OAuth should work without redirect URI errors
4. Dashboard should load with authentic YouTube videos

## Current Issues & Solutions

### YouTube Token Refresh Failures
Your current YouTube tokens have expired (`invalid_grant` error). The solution:
1. Complete OAuth setup for production domain
2. Users will need to re-authenticate via Google OAuth
3. Fresh tokens will enable full YouTube API functionality

### Automatic Fallback System
The application now includes:
- Intelligent error detection for expired tokens
- Clear re-authentication prompts for users
- Seamless handling of API quota issues
- Production-ready error messaging

## Code Changes Implemented

### Smart Domain Detection
```typescript
// Automatically detects production vs development
if (currentHost.includes('titletesterpro.com') || process.env.NODE_ENV === 'production') {
  redirectUri = 'https://titletesterpro.com/api/auth/callback/google';
}
```

### Enhanced Error Handling
```typescript
// Provides clear re-authentication guidance
if (apiError.message?.includes('invalid_grant')) {
  return res.status(401).json({ 
    error: 'YouTube authorization expired',
    reauth_required: true,
    reauth_url: '/api/auth/google'
  });
}
```

## Next Steps

1. **Update Google Cloud Console** with both redirect URIs (most critical)
2. **Deploy to titletesterpro.com** (code is ready)
3. **Test OAuth flow** on production domain
4. **Re-authenticate users** to refresh YouTube tokens

The application is fully prepared for production deployment once Google Cloud Console is updated with the correct redirect URIs.