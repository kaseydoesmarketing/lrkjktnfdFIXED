# Google OAuth Console Update Steps

## After Deployment - Required Actions

### 1. Get Your Production URL
After clicking "Deploy" in Replit, your app will be available at:
```
https://titletesterpro.[YOUR-USERNAME].repl.co
```

### 2. Update Google Cloud Console

#### A. Update OAuth 2.0 Client ID Settings
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID: `618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com`
4. Update these fields:

**Authorized JavaScript origins:**
```
https://titletesterpro.[YOUR-USERNAME].repl.co
```

**Authorized redirect URIs:**
```
https://titletesterpro.[YOUR-USERNAME].repl.co/api/auth/callback/google
```

#### B. Update OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Click **Edit App**
3. Update these URLs:

**Homepage URL:**
```
https://titletesterpro.[YOUR-USERNAME].repl.co
```

**Privacy Policy URL:**
```
https://titletesterpro.[YOUR-USERNAME].repl.co/privacy
```

**Terms of Service URL:**
```
https://titletesterpro.[YOUR-USERNAME].repl.co/terms
```

### 3. Test URLs Before Resubmitting
Verify these pages load correctly:
- ✅ Homepage: Displays TitleTesterPro landing page
- ✅ Privacy Policy: Shows complete privacy policy content
- ✅ Terms of Service: Shows complete terms of service content
- ✅ OAuth Flow: Login with Google works correctly

### 4. Resubmit for Verification
1. Save all changes in Google Cloud Console
2. Test OAuth flow end-to-end
3. Reply to Google's verification email with the updated URLs
4. Mention that all URLs are now responsive and properly configured

### 5. Verification Email Template
```
Subject: Re: OAuth App Verification - Updated URLs

Hello Google OAuth Review Team,

I have addressed all the issues mentioned in your review:

1. ✅ Homepage URL updated and now responsive: https://titletesterpro.[YOUR-USERNAME].repl.co
2. ✅ Privacy Policy URL updated and responsive: https://titletesterpro.[YOUR-USERNAME].repl.co/privacy
3. ✅ Terms of Service URL updated and responsive: https://titletesterpro.[YOUR-USERNAME].repl.co/terms
4. ✅ All URLs are now different and properly configured
5. ✅ OAuth redirect URI updated in console settings

The application is now fully deployed and all pages are accessible. Please continue with the verification process.

Thank you for your patience.

Best regards,
[Your Name]
```

### Note:
Replace `[YOUR-USERNAME]` with your actual Replit username throughout all URLs.