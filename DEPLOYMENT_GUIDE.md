# TitleTesterPro Deployment & Testing Guide

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Chrome browser (for extension testing)
- Google Cloud Console project with YouTube API enabled

### 1. Environment Setup

**Backend Configuration:**
```bash
cd server
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/titletester"

# Google OAuth (Dual Clients)
GOOGLE_OAUTH_CLIENT_ID="your-read-client-id"
GOOGLE_OAUTH_CLIENT_SECRET="your-read-client-secret"
GOOGLE_OAUTH_WRITE_CLIENT_ID="your-write-client-id"
GOOGLE_OAUTH_WRITE_CLIENT_SECRET="your-write-client-secret"
OAUTH_REDIRECT_URI="http://localhost:5000/auth/callback"

# Encryption
ENCRYPTION_KEY="your-32-character-encryption-key"

# WebSocket
WEBSOCKET_PORT=8080
```

### 2. Installation & Database Setup

**Install Dependencies:**
```bash
# Root level
npm install

# Backend
cd server && npm install

# Frontend  
cd ../client && npm install
```

**Database Migration:**
```bash
cd server
npm run db:push
```

### 3. Start Development Servers

**Option A: All services at once**
```bash
# From root directory
npm run dev
```

**Option B: Individual services**
```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev

# Terminal 3: WebSocket (if separate)
cd server && npm run websocket
```

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- WebSocket: ws://localhost:8080

## 🔧 Browser Extension Setup

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `/extension` directory from your project
5. Extension should appear with TitleTesterPro icon

### 2. Connect Extension to Account

1. Open the web app at http://localhost:3000
2. Complete OAuth authentication (both read and write)
3. Go to Settings → Extension Setup
4. Copy your User ID
5. Click the extension icon in Chrome
6. Click "Connect to TitleTesterPro"
7. Paste your User ID and connect

### 3. Test Extension on YouTube Studio

1. Navigate to https://studio.youtube.com
2. Open any video's details page
3. Extension should automatically start collecting analytics
4. Check browser console for connection logs

## 🧪 Testing Procedures

### Frontend Testing

**Authentication Flow:**
1. Visit http://localhost:3000
2. Click "Connect YouTube (Read Access)"
3. Complete Google OAuth flow
4. Verify redirect to dashboard
5. Click "Connect YouTube (Write Access)"
6. Complete second OAuth flow
7. Verify both permissions are active

**Dashboard Functionality:**
1. Create a new title test
2. Add multiple title variations
3. Set rotation schedule
4. Verify test appears in active tests list
5. Check analytics data display

### Backend API Testing

**Health Check:**
```bash
curl http://localhost:5000/health
```

**Authentication Endpoints:**
```bash
# Read OAuth
curl http://localhost:5000/auth/youtube/read

# Write OAuth  
curl http://localhost:5000/auth/youtube/write
```

**API Endpoints:**
```bash
# Get user tests
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/tests

# Create test
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"videoId":"test123","titles":["Title A","Title B"]}' \
  http://localhost:5000/api/tests
```

### Extension Testing

**Connection Test:**
1. Open extension popup
2. Verify connection status shows "Connected"
3. Click "Sync Analytics" - should show success
4. Check WebSocket connection in browser dev tools

**Data Collection Test:**
1. Go to YouTube Studio video page
2. Open browser dev tools → Console
3. Look for "TitleTesterPro extension loaded" message
4. Verify analytics data is being collected every 30 seconds
5. Check network tab for WebSocket messages

**Title Update Test:**
1. Create a title test in the web app
2. Set immediate rotation
3. Go to YouTube Studio for that video
4. Extension should automatically update the title
5. Verify title change in YouTube Studio

## 🌐 Production Deployment

### Frontend Deployment (Vercel)

```bash
cd client
npm run build
```

Deploy the `dist` folder to Vercel or use:
```bash
npx vercel --prod
```

**Environment Variables for Production:**
- `VITE_API_URL`: Your backend URL
- `VITE_WEBSOCKET_URL`: Your WebSocket URL

### Backend Deployment (Railway/Fly.io)

**Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up
```

**Fly.io:**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly deploy
```

**Production Environment Variables:**
- All `.env` variables with production values
- `NODE_ENV=production`
- `CORS_ORIGIN`: Your frontend URL

### Database (Supabase)

1. Create Supabase project
2. Get connection string
3. Update `DATABASE_URL` in production
4. Run migrations: `npm run db:push`

## 🔍 Troubleshooting

### Common Issues

**OAuth Errors:**
- Verify Google Cloud Console setup
- Check redirect URIs match exactly
- Ensure YouTube API is enabled

**Extension Not Connecting:**
- Check WebSocket server is running
- Verify CORS settings allow extension origin
- Check User ID is correct

**Database Connection:**
- Verify PostgreSQL is running
- Check connection string format
- Ensure database exists

**API Quota Exceeded:**
- Check quota usage in Google Cloud Console
- Implement rate limiting
- Monitor daily usage (200 updates/day limit)

### Debug Commands

**Check Service Status:**
```bash
# Backend health
curl http://localhost:5000/health

# Database connection
npm run db:check

# WebSocket connection
wscat -c ws://localhost:8080
```

**View Logs:**
```bash
# Backend logs
cd server && npm run logs

# Extension logs
Open Chrome Dev Tools → Console (on any page with extension)
```

## 📊 Monitoring & Analytics

### Key Metrics to Monitor

1. **API Usage**: Track YouTube API quota consumption
2. **Extension Connections**: Monitor active extension users
3. **Test Performance**: A/B test completion rates
4. **Error Rates**: Authentication and API failures

### Health Checks

- Backend: `/health` endpoint
- Database: Connection pool status
- WebSocket: Active connection count
- Extension: Heartbeat messages

## 🔐 Security Considerations

1. **Token Storage**: All YouTube tokens are AES-256 encrypted
2. **CORS**: Restrict origins in production
3. **Rate Limiting**: Implement API rate limits
4. **Extension Security**: Content Security Policy enabled
5. **Environment Variables**: Never commit secrets to git

## 📈 Scaling Considerations

1. **Database**: Use connection pooling
2. **WebSocket**: Consider Redis for multi-instance scaling
3. **Cron Jobs**: Use external scheduler (not serverless functions)
4. **CDN**: Use Cloudflare for static assets
5. **Monitoring**: Implement Sentry for error tracking

---

**Need Help?** Check the troubleshooting section or review the original codebase documentation for additional context.
