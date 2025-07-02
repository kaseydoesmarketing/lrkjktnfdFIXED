# PRODUCTION OAUTH CONFIGURATION FOR TITLETESTERPRO.COM

## Google Cloud Console Setup Required

To make OAuth work on both development (Replit) and production (titletesterpro.com), you need to add BOTH redirect URIs to your Google Cloud Console:

### Step 1: Update Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials  
3. Click on OAuth 2.0 Client ID: `618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com`
4. In "Authorized redirect URIs", add BOTH these URLs:

```
https://titletesterpro.com/api/auth/callback/google
https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/api/auth/callback/google
```

### Step 2: Verify Production Domain Configuration
Ensure your OAuth consent screen has:
- **Homepage URL**: https://titletesterpro.com
- **Privacy Policy URL**: https://titletesterpro.com/privacy
- **Terms of Service URL**: https://titletesterpro.com/terms

### Step 3: Test Both Environments
After updating Google Cloud Console:
- Development: https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/
- Production: https://titletesterpro.com/

Both should now work with Google OAuth without redirect URI mismatch errors.

## Current Status
- Code supports dynamic domain detection
- Automatic fallback system implemented  
- Production-ready OAuth configuration active
- Development authentication bypass functional

## Next Steps
1. Update Google Cloud Console with both redirect URIs
2. Test OAuth on both domains
3. Verify YouTube API functionality on production