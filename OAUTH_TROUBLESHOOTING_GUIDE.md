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
- ❌ Redirect URI mismatch (needs manual fix in Google Cloud Console)
- ✅ Client ID and Secret configured in Replit

### Next Steps
1. Update Google Cloud Console redirect URI
2. Test OAuth login
3. Complete TitleTesterPro authentication setup