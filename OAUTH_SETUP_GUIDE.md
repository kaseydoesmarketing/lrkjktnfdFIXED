# Google OAuth Setup Guide for TitleTesterPro

## Current Issue
Your Google Cloud Console OAuth consent screen requires verification for YouTube API scopes before external users can authenticate.

## Required Actions in Google Cloud Console

### 1. Complete Scope Justifications
For each YouTube scope, you need to provide:

**Scope: `https://www.googleapis.com/auth/youtube.readonly`**
- **Justification:** "TitleTesterPro needs read access to retrieve video analytics data (views, impressions, CTR, average view duration) to measure the performance of different title variants during A/B testing."

**Scope: `https://www.googleapis.com/auth/youtube`** 
- **Justification:** "TitleTesterPro needs to modify video metadata (specifically video titles) to automatically rotate different title variants during A/B testing experiments."

**Scope: `https://www.googleapis.com/auth/youtube.force-ssl`**
- **Justification:** "TitleTesterPro requires secure HTTPS access to YouTube API for updating video titles and retrieving analytics data during title A/B testing."

### 2. Demo Video Requirements
Google requires a demo video showing:
- How your app requests YouTube permissions
- What data your app accesses
- How users benefit from granting these permissions

**Demo Video Script:**
1. Show login page with "Continue with Google" button
2. Show Google OAuth consent screen with YouTube permissions
3. Show dashboard with video selection and title variants
4. Show analytics data being retrieved and displayed
5. Show title rotation in action

### 3. Steps to Complete Verification

1. **Go to Google Cloud Console** → APIs & Services → OAuth consent screen
2. **Click "Edit App"**
3. **In Scopes section**, click "Add or Remove Scopes"
4. **For each YouTube scope**, click the pencil icon and add justification text above
5. **Upload demo video** (can be unlisted YouTube video)
6. **Submit for verification**
7. **Wait for Google approval** (can take 1-7 days)

### 4. Temporary Workaround
While waiting for verification, you can:
- Add your email as a "Test User" in the OAuth consent screen
- This allows only test users to authenticate during development
- Production users will see "This app isn't verified" until approval

## Current OAuth Configuration
- Client ID: `618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com`
- Redirect URI: `https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/api/auth/callback/google`
- Scopes: YouTube readonly, YouTube manage, YouTube force-ssl, userinfo email, userinfo profile

## Database Schema Fixed
✅ Fixed `expires_at` column type from integer to bigint to handle OAuth token timestamps
✅ OAuth authentication flow should work once Google verification is complete

## Next Steps
1. Complete scope justifications in Google Cloud Console
2. Create and upload demo video
3. Submit for verification
4. Test authentication with your email as test user
5. Once approved, all users can authenticate successfully