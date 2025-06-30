# Google Cloud Console Update Instructions

## Immediate Actions Required for OAuth Verification

### Step 1: Update OAuth 2.0 Client ID Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Credentials**
3. Click on your OAuth 2.0 Client ID: `618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com`

### Step 2: Update Authorized Redirect URIs

**Remove old URIs and add:**
```
https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/api/auth/callback/google
```

### Step 3: Update Authorized JavaScript Origins

**Add:**
```
https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev
```

### Step 4: Update OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Click **Edit App**

**Update these fields:**

**Homepage URL:**
```
https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/
```

**Privacy Policy URL:**
```
https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/privacy
```

**Terms of Service URL:**
```
https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/terms
```

### Step 5: Reply to Google's Email

Copy and send the content from `GOOGLE_OAUTH_RESPONSE.md` to Google's verification team.

### Step 6: Verify URLs Work

Test each URL to ensure they load properly:
- ✅ Homepage loads
- ✅ Privacy policy displays
- ✅ Terms of service displays
- ✅ OAuth callback endpoint exists

All URLs are currently working and accessible for Google's verification team.