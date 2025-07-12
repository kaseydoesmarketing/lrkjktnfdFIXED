# TitleTesterPro Authentication Rebuild Implementation

## Phase 1: Environment Configuration

### 1.1 Update .env File
```env
# Supabase (Keep existing)
VITE_SUPABASE_URL=https://xyehwoacgpsxakhjwglq.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Use Supabase's Postgres)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xyehwoacgpsxakhjwglq.supabase.co:5432/postgres

# Remove these (no longer needed with Supabase Auth)
# GOOGLE_CLIENT_ID=xxx (DELETE)
# GOOGLE_CLIENT_SECRET=xxx (DELETE)
# GOOGLE_REDIRECT_URI=xxx (DELETE)
```

### 1.2 Supabase Dashboard Configuration

1. **Go to Supabase Dashboard → Authentication → Providers**
2. **Enable Google Provider** with these settings:
   ```
   Client ID: [Your Google OAuth Client ID]
   Client Secret: [Your Google OAuth Client Secret]
   Authorized redirect URIs: 
   - https://xyehwoacgpsxakhjwglq.supabase.co/auth/v1/callback
   - http://localhost:5000/auth/callback (for development)
   - https://titletesterpro.com/auth/callback (for production)
   ```

3. **Configure OAuth Scopes** in Supabase:
   ```
   openid
   email
   profile
   https://www.googleapis.com/auth/youtube.readonly
   https://www.googleapis.com/auth/youtube
   https://www.googleapis.com/auth/yt-analytics.readonly
   ```

4. **Enable "Use provider tokens"** in Supabase Dashboard
   - This allows access to Google OAuth tokens via Supabase session

## Phase 2: Database Schema Simplification

### 2.1 Clean Users Table
```sql
-- Remove OAuth fields from users table (Supabase handles this)
ALTER TABLE users 
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token,
DROP COLUMN IF EXISTS youtube_channel_id,
DROP COLUMN IF EXISTS youtube_channel_title;

-- Keep only essential user fields
-- id, email, name, image, created_at, last_login_at, 
-- stripe_customer_id, stripe_subscription_id, subscription_status, subscription_tier
```

### 2.2 Simplify Accounts Table  
```sql
-- Accounts table stores YouTube channel info only
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT,
ADD COLUMN IF NOT EXISTS youtube_channel_title TEXT,
ADD COLUMN IF NOT EXISTS youtube_channel_thumbnail TEXT;

-- Remove token fields (Supabase manages these)
ALTER TABLE accounts
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token,
DROP COLUMN IF EXISTS expires_at;
```

### 2.3 Drop Unnecessary Tables
```sql
DROP TABLE IF EXISTS temp_oauth;
DROP TABLE IF EXISTS sessions; -- Supabase manages sessions
```

## Phase 3: Backend Implementation

### 3.1 New Authentication Service
```typescript
// server/auth/supabase-auth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getYouTubeTokens(userId: string) {
  // Get provider tokens from Supabase
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  
  if (error || !data.user) {
    throw new Error('User not found');
  }
  
  // Supabase stores provider tokens in user.app_metadata
  const providerToken = data.user.app_metadata.provider_token;
  const providerRefreshToken = data.user.app_metadata.provider_refresh_token;
  
  if (!providerToken) {
    throw new Error('No YouTube tokens found');
  }
  
  return {
    accessToken: providerToken,
    refreshToken: providerRefreshToken
  };
}

export async function refreshYouTubeTokens(userId: string) {
  // Supabase automatically refreshes tokens
  // Just get the latest session
  const { data: { session }, error } = await supabase.auth.admin
    .getUserById(userId);
    
  if (error || !session) {
    throw new Error('Failed to refresh tokens');
  }
  
  return session;
}
```

### 3.2 Simplified Middleware
```typescript
// server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../auth/supabase-auth';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies['sb-access-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}
```

### 3.3 Clean API Routes
```typescript
// server/routes/auth.ts
router.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = req.user!;
  
  // Get user data from database
  const dbUser = await storage.getUserByEmail(user.email!);
  
  // Check if YouTube channel is connected
  const account = await storage.getAccountByUserId(user.id);
  
  res.json({
    id: user.id,
    email: user.email,
    name: dbUser?.name || user.user_metadata.full_name,
    image: dbUser?.image || user.user_metadata.avatar_url,
    hasYouTubeChannel: !!account?.youtubeChannelId,
    youtubeChannel: account ? {
      id: account.youtubeChannelId,
      title: account.youtubeChannelTitle,
      thumbnail: account.youtubeChannelThumbnail
    } : null
  });
});

// Logout endpoint
router.post('/api/auth/logout', async (req, res) => {
  res.clearCookie('sb-access-token');
  res.clearCookie('sb-refresh-token');
  res.json({ success: true });
});
```

## Phase 4: Frontend Implementation

### 4.1 Login Page (One-Step Auth)
```tsx
// client/src/pages/login.tsx
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async () => {
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/yt-analytics.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Login failed", 
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to TitleTesterPro</CardTitle>
          <CardDescription>
            Sign in with your Google account to start optimizing your YouTube titles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleLogin} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  {/* Google logo SVG */}
                </svg>
                Continue with Google
              </>
            )}
          </Button>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>This will:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access your YouTube channel information</li>
              <li>Update video titles during A/B tests</li>
              <li>View analytics for performance tracking</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.2 Auth Callback Handler
```tsx
// client/src/pages/auth-callback.tsx
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'wouter';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from URL hash
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setLocation('/login?error=auth_failed');
          return;
        }
        
        if (!session) {
          setLocation('/login');
          return;
        }
        
        // Check if we have YouTube access
        const hasYouTubeScopes = session.provider_token !== null;
        
        if (hasYouTubeScopes) {
          // Save YouTube channel info
          const response = await fetch('/api/auth/youtube-channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });
          
          if (!response.ok) {
            console.error('Failed to save YouTube channel');
          }
        }
        
        // Redirect to dashboard
        setLocation('/dashboard');
        
      } catch (error) {
        console.error('Callback error:', error);
        setLocation('/login?error=callback_failed');
      }
    };
    
    handleCallback();
  }, [setLocation]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Completing sign in...</p>
      </div>
    </div>
  );
}
```

### 4.3 Dashboard (No More YouTube Prompt)
```tsx
// client/src/pages/dashboard.tsx
export default function Dashboard() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me']
  });
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  
  // Direct to dashboard - no YouTube prompt needed!
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      <DashboardContent />
    </div>
  );
}
```

## Phase 5: YouTube Service with Auto-Refresh
```typescript
// server/services/youtube.ts
import { google } from 'googleapis';
import { getYouTubeTokens } from '../auth/supabase-auth';

export async function getYouTubeClient(userId: string) {
  const { accessToken, refreshToken } = await getYouTubeTokens(userId);
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  
  // Auto refresh on 401
  oauth2Client.on('tokens', (tokens) => {
    // Supabase handles this automatically
    console.log('Token refreshed');
  });
  
  return google.youtube({ version: 'v3', auth: oauth2Client });
}
```

## Phase 6: Security Best Practices

### 6.1 Environment Variables
```env
# Production
NODE_ENV=production
SUPABASE_JWT_SECRET=your-jwt-secret # For verifying Supabase JWTs

# Cookie settings
COOKIE_SECURE=true # HTTPS only in production
COOKIE_HTTPONLY=true
COOKIE_SAMESITE=lax
```

### 6.2 Rate Limiting
```typescript
// server/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: 'Too many login attempts'
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100 // 100 requests per 15 minutes
});
```

### 6.3 CORS Configuration
```typescript
// server/index.ts
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://titletesterpro.com']
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));
```