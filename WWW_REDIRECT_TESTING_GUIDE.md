# WWW Redirect Testing Guide

## Overview

This guide provides comprehensive testing procedures to verify that the www subdomain redirect functionality works correctly for Title Tester Pro.

## Testing Environment Setup

### Local Development Testing

1. **Start the development server:**
   ```bash
   cd /path/to/titletesterpro
   npm run dev
   # or
   pnpm dev
   ```

2. **Test with different host headers:**
   ```bash
   # Test www redirect with localhost
   curl -H "Host: www.localhost:5000" http://localhost:5000/
   
   # Test with custom host header
   curl -H "Host: www.titletesterpro.com" http://localhost:5000/
   ```

### Production Testing

## Test Cases

### 1. Basic Redirect Functionality

**Test 1.1: HTTP www to non-www redirect**
```bash
curl -I http://www.titletesterpro.com
```
Expected result:
- Status: 301 Moved Permanently
- Location: https://titletesterpro.com/

**Test 1.2: HTTPS www to non-www redirect**
```bash
curl -I https://www.titletesterpro.com
```
Expected result:
- Status: 301 Moved Permanently
- Location: https://titletesterpro.com/

**Test 1.3: Preserve URL path and query parameters**
```bash
curl -I https://www.titletesterpro.com/dashboard?test=123
```
Expected result:
- Status: 301 Moved Permanently
- Location: https://titletesterpro.com/dashboard?test=123

### 2. SSL Certificate Testing

**Test 2.1: SSL certificate validity for www subdomain**
```bash
openssl s_client -connect www.titletesterpro.com:443 -servername www.titletesterpro.com < /dev/null
```
Expected result:
- No certificate errors
- Certificate covers www.titletesterpro.com
- Valid certificate chain

**Test 2.2: SSL certificate validity for primary domain**
```bash
openssl s_client -connect titletesterpro.com:443 -servername titletesterpro.com < /dev/null
```
Expected result:
- No certificate errors
- Certificate covers titletesterpro.com
- Valid certificate chain

### 3. DNS Configuration Testing

**Test 3.1: DNS resolution for www subdomain**
```bash
nslookup www.titletesterpro.com
```
Expected result:
- CNAME record pointing to titletesterpro.com
- No A record conflicts

**Test 3.2: DNS propagation check**
```bash
dig www.titletesterpro.com CNAME
```
Expected result:
- CNAME record present
- Proper TTL values

### 4. Browser Testing

**Test 4.1: Manual browser test**
1. Open browser and navigate to `https://www.titletesterpro.com`
2. Verify no SSL warnings appear
3. Verify redirect to `https://titletesterpro.com`
4. Check browser address bar shows non-www URL

**Test 4.2: Different browsers**
Test in multiple browsers:
- Chrome
- Firefox
- Safari
- Edge

### 5. Application Functionality Testing

**Test 5.1: OAuth flow with www redirect**
1. Navigate to `https://www.titletesterpro.com`
2. Click "Get Started" or login
3. Verify OAuth flow works correctly after redirect
4. Ensure no authentication issues

**Test 5.2: API endpoints after redirect**
```bash
# Test API accessibility after redirect
curl -I https://www.titletesterpro.com/api/health
```
Expected result:
- Proper redirect to non-www API endpoint
- API responds correctly

### 6. Performance Testing

**Test 6.1: Redirect response time**
```bash
time curl -I https://www.titletesterpro.com
```
Expected result:
- Fast redirect response (< 200ms)
- No significant performance impact

**Test 6.2: Multiple concurrent redirects**
```bash
# Test multiple simultaneous requests
for i in {1..10}; do
  curl -I https://www.titletesterpro.com &
done
wait
```
Expected result:
- All redirects successful
- No server errors or timeouts

## Automated Testing Script

Create a comprehensive test script:

```bash
#!/bin/bash

echo "=== WWW Redirect Testing Script ==="

# Test 1: Basic HTTP redirect
echo "Testing HTTP redirect..."
HTTP_RESULT=$(curl -s -I http://www.titletesterpro.com | head -n 1)
echo "HTTP Result: $HTTP_RESULT"

# Test 2: Basic HTTPS redirect
echo "Testing HTTPS redirect..."
HTTPS_RESULT=$(curl -s -I https://www.titletesterpro.com | head -n 1)
echo "HTTPS Result: $HTTPS_RESULT"

# Test 3: DNS resolution
echo "Testing DNS resolution..."
DNS_RESULT=$(nslookup www.titletesterpro.com | grep -A 1 "canonical name")
echo "DNS Result: $DNS_RESULT"

# Test 4: SSL certificate
echo "Testing SSL certificate..."
SSL_RESULT=$(echo | openssl s_client -connect www.titletesterpro.com:443 -servername www.titletesterpro.com 2>/dev/null | grep "Verify return code")
echo "SSL Result: $SSL_RESULT"

# Test 5: Path preservation
echo "Testing path preservation..."
PATH_RESULT=$(curl -s -I https://www.titletesterpro.com/test-path | grep "Location:")
echo "Path Result: $PATH_RESULT"

echo "=== Testing Complete ==="
```

## Troubleshooting Common Issues

### Issue 1: Redirect Loop
**Symptoms:** Infinite redirects between www and non-www
**Solution:** 
- Check DNS CNAME configuration
- Verify Express middleware logic
- Ensure no conflicting redirect rules

### Issue 2: SSL Certificate Warnings
**Symptoms:** Browser shows SSL warnings on www subdomain
**Solution:**
- Verify certificate covers www subdomain
- Check certificate installation
- Consider wildcard certificate

### Issue 3: Slow Redirects
**Symptoms:** Long response times for www requests
**Solution:**
- Optimize DNS TTL values
- Check server response times
- Consider CDN configuration

### Issue 4: OAuth Issues After Redirect
**Symptoms:** Authentication fails after www redirect
**Solution:**
- Verify OAuth redirect URIs include both domains
- Check session handling across redirects
- Ensure cookies work with domain changes

## Monitoring and Alerts

### Set up monitoring for:
1. **Redirect functionality**
   - Regular checks for proper 301 redirects
   - Response time monitoring
   - Error rate tracking

2. **SSL certificate health**
   - Certificate expiration alerts
   - Certificate validity checks
   - Chain verification

3. **DNS configuration**
   - CNAME record monitoring
   - DNS propagation checks
   - TTL optimization

### Recommended monitoring tools:
- Pingdom
- UptimeRobot
- StatusCake
- Custom monitoring scripts

## Success Criteria

The www redirect implementation is successful when:

- ✅ HTTP www requests redirect to HTTPS non-www (301 status)
- ✅ HTTPS www requests redirect to HTTPS non-www (301 status)
- ✅ No SSL certificate warnings on www subdomain
- ✅ URL paths and query parameters preserved in redirects
- ✅ OAuth and authentication work correctly after redirects
- ✅ API endpoints accessible through redirects
- ✅ Fast redirect response times (< 200ms)
- ✅ DNS CNAME record properly configured
- ✅ All major browsers handle redirects correctly
- ✅ No infinite redirect loops
- ✅ Application functionality unaffected by redirects

## Regular Maintenance

### Monthly checks:
- Verify redirect functionality still works
- Check SSL certificate expiration dates
- Monitor redirect response times
- Test in different browsers

### Quarterly reviews:
- Review DNS configuration
- Update monitoring scripts
- Performance optimization
- Security audit of redirect implementation
