# Environment Variables Setup for TitleTesterPro

## Required Environment Variables

Add these environment variables to your Replit Secrets tab for production deployment:

### Frontend Supabase Configuration (Required for OAuth)
```
VITE_SUPABASE_URL=https://xyehwoacgpsxakhjwglq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZWh3b2FjZ3BzeGFraGp3Z2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NjMyMzYsImV4cCI6MjA2NzMzOTIzNn0.qmxeB9dFU1-KlAkjb-JrVFIj6IZZJZsmpDvTK-5QgkY
```

### Backend Supabase Configuration
```
SUPABASE_URL=https://xyehwoacgpsxakhjwglq.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZWh3b2FjZ3BzeGFraGp3Z2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NjMyMzYsImV4cCI6MjA2NzMzOTIzNn0.qmxeB9dFU1-KlAkjb-JrVFIj6IZZJZsmpDvTK-5QgkY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
```

### Database Configuration
```
DATABASE_URL=postgresql://postgres.xyehwoacgpsxakhjwglq:Princeandmarley8625!@aws-0-us-east-2.pooler.supabase.com:6543/postgres
```

### Google OAuth Configuration
```
GOOGLE_CLIENT_ID=618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### YouTube API Configuration
```
YOUTUBE_API_KEY=AIzaSyBU0B-0QASYFIXLO2p9bBOzeSJpE3GKqx0
```

### Application Configuration
```
NODE_ENV=production
CLIENT_URL=https://titletesterpro.com
SESSION_SECRET=1f4b2c7e9a8d5f3e7b9c4a2d8e6f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f
ENCRYPTION_KEY=my-super-secure-encryption-key-2025-titletesterpro
JWT_SECRET=your-super-secure-jwt-secret-here-2025
OAUTH_REDIRECT_URI=https://titletesterpro.com/api/auth/callback/google
```

## Supabase Dashboard Configuration

Configure these redirect URLs in Supabase → Authentication → URL Configuration → Redirect URLs:

```
https://titletesterpro.com/api/auth/callback
http://localhost:5173/api/auth/callback (optional: for local dev)
```

## Local Development

For local development, create a `.env` file in the project root with the above variables. The `.env` file is gitignored for security.

## OAuth Fix Summary

This resolves the Google OAuth authentication issues by:

1. **Adding missing frontend environment variables** - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were missing, causing the Supabase client to fail
2. **Configuring proper redirect URLs** - Supabase OAuth callback URL needs to be configured in both Google Cloud Console and Supabase Dashboard
3. **Providing complete environment configuration** - All required variables for production deployment

The OAuth flow now works correctly:
- User clicks "Connect with Google" 
- Redirects to Google authentication
- Google redirects to Supabase OAuth callback
- Supabase processes authentication and redirects to application callback
- User is successfully authenticated and can access dashboard
