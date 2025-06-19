# Domain Verification Guide for Google OAuth

## Step-by-Step Domain Verification Process

### 1. Access Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with the same Google account used for OAuth app

### 2. Add Your Property
1. Click "Add Property" 
2. Choose "URL prefix" method
3. Enter your full domain: `https://titletesterpro.[YOUR-USERNAME].repl.co`
4. Click "Continue"

### 3. Choose Verification Method
Google will offer several verification methods. Choose one:

#### Option A: HTML Tag (Recommended)
1. Select "HTML tag" method
2. Copy the meta tag code (looks like):
   ```html
   <meta name="google-site-verification" content="ABC123..." />
   ```
3. Replace `[VERIFICATION-CODE-PLACEHOLDER]` in your deployed app with the actual code
4. Redeploy the application
5. Click "Verify" in Search Console

#### Option B: HTML File Upload
1. Select "HTML file upload" method
2. Download the verification file
3. Upload it to your app's public directory
4. Ensure the file is accessible at: `https://titletesterpro.[YOUR-USERNAME].repl.co/google[FILENAME].html`
5. Click "Verify" in Search Console

### 4. Verify Ownership
1. After choosing your method and implementing it
2. Click the "Verify" button in Search Console
3. You should see "Ownership verified" message
4. The domain will now be listed in your Search Console properties

### 5. Why This is Required
Google requires domain verification for OAuth apps to:
- Confirm you own the website you're claiming
- Prevent malicious apps from impersonating legitimate websites
- Ensure compliance with their OAuth policies
- Validate that all provided URLs are legitimate and under your control

### 6. After Verification
Once domain verification is complete:
1. Keep the verification code/file in place (don't remove it)
2. Include verification status in your OAuth resubmission
3. Reference the verified domain in your communication with Google

### 7. Troubleshooting
If verification fails:
- Ensure the verification code is exactly as provided (no extra spaces)
- Check that the file/tag is accessible from the public internet
- Wait a few minutes and try again (DNS propagation)
- Ensure your deployment is live and accessible

### 8. Verification Status Check
You can always check verification status by:
1. Going to Google Search Console
2. Looking for your domain in the property list
3. Green checkmark = verified
4. Red X or warning = needs attention

Remember: Keep the verification in place permanently to maintain verified status.