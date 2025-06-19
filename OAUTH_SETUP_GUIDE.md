# Google OAuth Setup Guide for TitleTesterPro

## Current Issue
Your Google Cloud Console OAuth consent screen requires verification for YouTube API scopes before external users can authenticate.

## Required Actions in Google Cloud Console

### 1. Complete Scope Justifications
Copy and paste these exact texts into the "Enter justification here" field for each scope:

**For `https://www.googleapis.com/auth/youtube.readonly`:**
```
TitleTesterPro is a YouTube title A/B testing platform that helps creators optimize their video titles by automatically testing multiple variants. This scope is required to retrieve video analytics data including views, impressions, click-through rates, and average view duration to measure the performance of different title variants during testing periods. The app fetches this data periodically to determine which title performs best statistically.
```

**For `https://www.googleapis.com/auth/youtube`:**
```
TitleTesterPro automatically rotates video titles during A/B testing experiments to measure which title variant performs best. This scope is required to update video metadata (specifically the title field) at scheduled intervals during the test period. Users configure multiple title variants and rotation schedules, and the app changes titles automatically to collect performance data for statistical comparison.
```

**For `https://www.googleapis.com/auth/youtube.force-ssl`:**
```
TitleTesterPro requires secure HTTPS access to the YouTube API for both retrieving analytics data and updating video titles during A/B testing. This ensures all API communications are encrypted and secure when handling sensitive video metadata and analytics information for creators' YouTube channels.
```

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

**Based on your screenshots, here's exactly what to do:**

1. **In the "How will the scopes be used?" text box**, paste this comprehensive justification:
```
TitleTesterPro is a YouTube title A/B testing platform for content creators. The app requires YouTube API access to: 1) Retrieve video analytics (views, CTR, watch time) to measure title performance, 2) Automatically rotate video titles during testing periods, and 3) Provide creators with statistical data to optimize their content. The app helps creators increase video performance through data-driven title optimization.
```

2. **For each individual scope** (the ones with warning triangles), use the specific justifications above

3. **Upload demo video** showing the app in action (can be unlisted YouTube video)

4. **Submit for verification** - Google review typically takes 1-7 business days

5. **Add yourself as a test user** while waiting for approval

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