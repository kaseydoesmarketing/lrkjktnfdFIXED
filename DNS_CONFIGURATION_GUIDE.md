# DNS Configuration Guide for www Redirect

## Overview

This guide explains how to configure DNS-level redirects for the www subdomain to prevent SSL certificate warnings and ensure seamless user experience when accessing www.titletesterpro.com.

## The Problem

When users visit www.titletesterpro.com, they may encounter SSL certificate warnings because:
1. SSL certificates are typically issued for the primary domain (titletesterpro.com) only
2. The www subdomain requires separate certificate coverage or proper DNS configuration
3. Users see SSL warnings before the Express middleware redirect can execute

## Recommended Solution: DNS-Level Redirect

The preferred solution is to configure DNS records to handle the www redirect at the DNS level, preventing SSL warnings entirely.

### Option 1: CNAME Record (Recommended)

Configure a CNAME record that points the www subdomain to the primary domain:

```
Type: CNAME
Name: www
Value: titletesterpro.com
TTL: 300 (or your preferred value)
```

This approach:
- ✅ Prevents SSL certificate warnings
- ✅ Works at the DNS level before HTTP requests
- ✅ Maintains SEO benefits with proper 301 redirects
- ✅ Compatible with most DNS providers

### Option 2: A Record with Redirect Service

Some DNS providers offer redirect services:

```
Type: A (with redirect)
Name: www
Value: titletesterpro.com
Redirect Type: 301 (Permanent)
```

## DNS Provider-Specific Instructions

### Cloudflare
1. Log into Cloudflare dashboard
2. Select your domain (titletesterpro.com)
3. Go to DNS > Records
4. Click "Add record"
5. Set Type: CNAME, Name: www, Target: titletesterpro.com
6. Ensure Proxy status is "Proxied" (orange cloud)
7. Click "Save"

### Namecheap
1. Log into Namecheap account
2. Go to Domain List > Manage
3. Click "Advanced DNS"
4. Add new record:
   - Type: CNAME Record
   - Host: www
   - Value: titletesterpro.com
   - TTL: Automatic
5. Click "Save All Changes"

### GoDaddy
1. Log into GoDaddy account
2. Go to My Products > DNS
3. Click "Add" under Records
4. Select Type: CNAME
5. Set Name: www, Value: titletesterpro.com
6. Click "Save"

### Google Domains
1. Log into Google Domains
2. Select your domain
3. Go to DNS tab
4. Scroll to "Custom resource records"
5. Add: Name: www, Type: CNAME, Data: titletesterpro.com
6. Click "Add"

## SSL Certificate Options

### Option 1: Wildcard Certificate (Recommended)
Request a wildcard SSL certificate that covers both:
- titletesterpro.com
- *.titletesterpro.com (includes www.titletesterpro.com)

### Option 2: Multi-Domain Certificate
Request a certificate that explicitly covers:
- titletesterpro.com
- www.titletesterpro.com

### Option 3: Let's Encrypt with Certbot
If using Let's Encrypt, request certificates for both domains:
```bash
certbot certonly --webroot -w /path/to/webroot -d titletesterpro.com -d www.titletesterpro.com
```

## Verification Steps

### 1. DNS Propagation Check
Use online tools to verify DNS propagation:
- https://dnschecker.org/
- https://whatsmydns.net/

Search for: www.titletesterpro.com
Expected result: Should resolve to titletesterpro.com

### 2. SSL Certificate Verification
Check SSL certificate coverage:
```bash
openssl s_client -connect www.titletesterpro.com:443 -servername www.titletesterpro.com
```

### 3. HTTP Redirect Test
Test the redirect behavior:
```bash
curl -I http://www.titletesterpro.com
curl -I https://www.titletesterpro.com
```

Expected: 301 redirect to https://titletesterpro.com

## Backup Solution: Express Middleware

The application already includes Express middleware as a backup solution in `/server/index.ts`:

```typescript
// Redirect www to non-www
app.use((req, res, next) => {
  const host = req.get('host');
  if (host && host.startsWith('www.')) {
    const newHost = host.slice(4); // Remove 'www.'
    const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return res.redirect(301, `${protocol}://${newHost}${req.originalUrl}`);
  }
  next();
});
```

This middleware:
- Handles cases where DNS-level redirect isn't configured
- Provides 301 permanent redirect status
- Preserves the original URL path and query parameters
- Detects HTTPS properly through proxy headers

## Troubleshooting

### Common Issues

1. **DNS Changes Not Taking Effect**
   - Wait for DNS propagation (up to 48 hours)
   - Clear local DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)
   - Check TTL values and reduce if necessary

2. **SSL Certificate Warnings Persist**
   - Verify certificate covers www subdomain
   - Check certificate chain completeness
   - Ensure proper certificate installation

3. **Redirect Loops**
   - Verify DNS CNAME points to primary domain, not back to www
   - Check for conflicting redirect rules
   - Ensure Express middleware only redirects www to non-www

4. **Mixed Content Warnings**
   - Ensure all resources load over HTTPS
   - Update any hardcoded HTTP URLs to HTTPS
   - Check for HTTP resources in CSS/JS files

### Testing Commands

```bash
# Test DNS resolution
nslookup www.titletesterpro.com

# Test HTTP redirect
curl -L -v http://www.titletesterpro.com

# Test HTTPS redirect
curl -L -v https://www.titletesterpro.com

# Check SSL certificate
openssl s_client -connect www.titletesterpro.com:443 -servername www.titletesterpro.com < /dev/null
```

## Production Deployment Checklist

- [ ] DNS CNAME record configured for www subdomain
- [ ] SSL certificate covers both www and non-www domains
- [ ] DNS propagation completed (test with online tools)
- [ ] HTTP and HTTPS redirects working correctly
- [ ] No SSL certificate warnings on www subdomain
- [ ] Express middleware backup redirect functioning
- [ ] All resources loading over HTTPS
- [ ] SEO redirects properly configured (301 status)

## Monitoring and Maintenance

### Regular Checks
- Monitor SSL certificate expiration dates
- Verify DNS records remain correctly configured
- Test redirect functionality periodically
- Monitor for any SSL certificate warnings

### Automated Monitoring
Consider setting up automated monitoring for:
- SSL certificate expiration alerts
- DNS record changes
- Redirect functionality tests
- Website availability from both www and non-www URLs

## Support Resources

- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [DNS Propagation Checker](https://dnschecker.org/)
