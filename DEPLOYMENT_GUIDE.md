# TitleTesterPro Deployment Guide

## Google OAuth Verification Issues Resolution

### Issues Identified:
1. **Unresponsive homepage URL**: Development URL not accessible for verification
2. **Privacy policy URL unresponsive**: Same issue as homepage
3. **Domain ownership**: Need proper production domain
4. **WWW subdomain SSL warnings**: SSL certificates don't cover www subdomain

### Solutions Implemented:

#### 1. Deployment Configuration
- Application configured for Replit Deployments
- Production-ready build with optimized assets
- Environment variables properly configured

#### 2. Domain Configuration
**After deployment, your production URLs will be:**

**Production URLs with Custom Domain:**

**Homepage URL:** 
```
https://titletesterpro.com/
```

**Privacy Policy URL:**
```
https://titletesterpro.com/privacy
```

**Terms of Service URL:**
```
https://titletesterpro.com/terms
```

**Authorized Redirect URIs:**
```
https://titletesterpro.com/api/auth/callback/google
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

#### 5. WWW Subdomain Configuration:

**DNS-Level Redirect (Recommended):**
1. Configure CNAME record: www.titletesterpro.com → titletesterpro.com
2. Ensure SSL certificate covers both www and non-www domains
3. Test redirect functionality: `curl -I https://www.titletesterpro.com`

**SSL Certificate Options:**
- Wildcard certificate (*.titletesterpro.com)
- Multi-domain certificate (titletesterpro.com + www.titletesterpro.com)
- Let's Encrypt with both domains

**Backup Solution:**
- Express middleware already implemented for www redirect
- Handles cases where DNS-level redirect isn't configured

#### 6. Production Checklist:
- [ ] Application deployed and accessible
- [ ] Privacy policy page responsive at /privacy
- [ ] Terms of service page responsive at /terms
- [ ] Homepage loads without errors
- [ ] Google OAuth redirect URIs updated
- [ ] OAuth consent screen URLs updated
- [ ] Test OAuth flow works end-to-end
- [ ] DNS CNAME record configured for www subdomain
- [ ] SSL certificate covers both www and non-www domains
- [ ] WWW redirect working without SSL warnings
- [ ] Test both www.domain and domain access patterns

### Next Steps:
1. Deploy the application to get production URL
2. Configure DNS CNAME record for www subdomain
3. Ensure SSL certificate covers both domains
4. Update all Google Cloud Console settings with new URLs
5. Test all URLs for responsiveness (including www redirect)
6. Re-submit for OAuth verification with corrected information

### WWW Redirect Testing:
```bash
# Test DNS resolution
nslookup www.titletesterpro.com

# Test HTTP redirect
curl -I http://www.titletesterpro.com

# Test HTTPS redirect
curl -I https://www.titletesterpro.com

# Expected: 301 redirect to https://titletesterpro.com
```

### Support:
If you need a custom domain instead of repl.co, you can:
1. Purchase a domain (e.g., titletesterpro.com)
2. Configure it in Replit Deployments
3. Set up DNS CNAME record for www subdomain
4. Configure SSL certificate for both www and non-www
5. Update all OAuth settings with custom domain

### Additional Resources:
- See `DNS_CONFIGURATION_GUIDE.md` for detailed DNS setup instructions
- See `PRODUCTION_ARCHITECTURE.md` for comprehensive architecture details
- Monitor SSL certificate expiration and DNS configuration regularly
