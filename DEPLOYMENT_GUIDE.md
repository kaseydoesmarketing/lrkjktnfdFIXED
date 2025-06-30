# TitleTesterPro Deployment Guide

## Google OAuth Verification Issues Resolution

### Issues Identified:
1. **Unresponsive homepage URL**: Development URL not accessible for verification
2. **Privacy policy URL unresponsive**: Same issue as homepage
3. **Domain ownership**: Need proper production domain

### Solutions Implemented:

#### 1. Deployment Configuration
- Application configured for Replit Deployments
- Production-ready build with optimized assets
- Environment variables properly configured

#### 2. Domain Configuration
**After deployment, your production URLs will be:**

**Current Production URLs (Updated):**

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

**Authorized Redirect URIs:**
```
https://050a0a28-8c3e-40e2-a429-c0eedc7eca5f-00-2po674nha0zje.riker.replit.dev/api/auth/callback/google
```

**Important:** Replace `[your-username]` with your actual Replit username.

#### 3. Steps to Fix Google OAuth Verification:

1. **Deploy the Application:**
   - Click "Deploy" in Replit to get a production URL
   - Note the production domain (e.g., titletesterpro.username.repl.co)

2. **Update Google Cloud Console:**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID
   - Update "Authorized redirect URIs" with production domain
   - Update "Authorized JavaScript origins" if needed

3. **Update OAuth Consent Screen:**
   - Go to OAuth consent screen settings
   - Update Homepage URL to production domain
   - Update Privacy Policy URL to production domain + /privacy
   - Update Terms of Service URL to production domain + /terms
   - Ensure all URLs are accessible and responsive

4. **Verify URLs Work:**
   - Test homepage loads properly
   - Test /privacy page displays privacy policy
   - Test /terms page displays terms of service
   - Test OAuth flow works with new URLs

#### 4. Environment Variables Needed:
```
GOOGLE_CLIENT_ID=618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=[your-secret]
DATABASE_URL=[postgres-url]
PRODUCTION_URL=[optional-custom-domain]
```

#### 5. Production Checklist:
- [ ] Application deployed and accessible
- [ ] Privacy policy page responsive at /privacy
- [ ] Terms of service page responsive at /terms
- [ ] Homepage loads without errors
- [ ] Google OAuth redirect URIs updated
- [ ] OAuth consent screen URLs updated
- [ ] Test OAuth flow works end-to-end

### Next Steps:
1. Deploy the application to get production URL
2. Update all Google Cloud Console settings with new URLs
3. Test all URLs for responsiveness
4. Re-submit for OAuth verification with corrected information

### Support:
If you need a custom domain instead of repl.co, you can:
1. Purchase a domain (e.g., titletesterpro.com)
2. Configure it in Replit Deployments
3. Update all OAuth settings with custom domain