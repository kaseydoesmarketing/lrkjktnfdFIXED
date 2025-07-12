# Files and Components to Delete for Clean Authentication Rebuild

## Backend Files to Delete

### 1. Authentication Routes
```bash
# Delete these files completely
rm server/routes/oauth-callback.ts  # Custom OAuth handler - conflicts with Supabase
rm server/routes/auth-google.ts     # If exists - legacy Google OAuth
rm server/auth/googleAuth.ts        # Legacy authentication
rm server/auth/passport.ts          # Passport.js configuration
```

### 2. Utility Files
```bash
rm server/utils/encryption.ts       # No longer needed - Supabase handles encryption
rm server/utils/tokenRefresh.ts     # Supabase handles token refresh
```

### 3. Database Cleanup Scripts
```sql
-- Run these SQL commands in your database

-- Remove OAuth fields from users table
ALTER TABLE users 
DROP COLUMN IF EXISTS access_token CASCADE,
DROP COLUMN IF EXISTS refresh_token CASCADE,
DROP COLUMN IF EXISTS youtube_channel_id CASCADE,
DROP COLUMN IF EXISTS youtube_channel_title CASCADE;

-- Drop temporary OAuth table
DROP TABLE IF EXISTS temp_oauth CASCADE;

-- Drop sessions table (Supabase manages sessions)
DROP TABLE IF EXISTS sessions CASCADE;

-- Simplify accounts table (keep only channel info)
ALTER TABLE accounts
DROP COLUMN IF EXISTS access_token CASCADE,
DROP COLUMN IF EXISTS refresh_token CASCADE,
DROP COLUMN IF EXISTS expires_at CASCADE,
DROP COLUMN IF EXISTS provider_account_id CASCADE;
```

## Frontend Components to Delete

### 1. Components
```bash
# Delete these components
rm client/src/components/ConnectYouTubePrompt.tsx  # No longer needed
rm client/src/components/ReconnectGoogleButton.tsx # Supabase handles reconnection
rm client/src/pages/select-channel.tsx             # Single-step auth removes this need
rm client/src/pages/oauth-error.tsx                # Simplified error handling
```

### 2. Legacy Auth Utilities
```bash
rm client/src/lib/auth.ts           # If exists - legacy auth utilities
rm client/src/hooks/useAuth.ts      # If exists - replaced by Supabase hooks
```

## Environment Variables to Remove
```env
# Delete these from .env
GOOGLE_CLIENT_ID=xxx                # DELETE - Supabase handles this
GOOGLE_CLIENT_SECRET=xxx            # DELETE - Supabase handles this  
GOOGLE_REDIRECT_URI=xxx             # DELETE - Supabase handles this
ENCRYPTION_KEY=xxx                  # DELETE - Supabase handles encryption
SESSION_SECRET=xxx                  # DELETE - Supabase manages sessions
```

## Code Blocks to Remove

### 1. In server/storage.ts
```typescript
// DELETE these methods:
- updateUserYouTubeTokens()
- saveTempTokens()
- getTempTokens()
- deleteTempTokens()
- Any OAuth token-related methods
```

### 2. In server/routes.ts
```typescript
// DELETE these route imports and registrations:
- import oauthCallbackRouter from './routes/oauth-callback';
- app.use(oauthCallbackRouter);
- Any custom OAuth endpoints
```

### 3. In client/src/App.tsx
```typescript
// DELETE these routes:
- <Route path="/select-channel" component={SelectChannel} />
- <Route path="/oauth-error" component={OAuthError} />
- <Route path="/connect-youtube" component={ConnectYouTubePrompt} />
```

## Migration Checklist

### Before Deleting:
1. ✅ Export all data from Neon database
2. ✅ Backup current codebase
3. ✅ Document any custom business logic in deleted files
4. ✅ Save any reusable utility functions

### After Deleting:
1. ✅ Run `npm run build` to ensure no broken imports
2. ✅ Test authentication flow end-to-end
3. ✅ Verify YouTube API calls work with new token system
4. ✅ Check that all protected routes require authentication

## Summary of Changes

### What You're Removing:
- 15+ files of custom OAuth code
- 4 database tables/columns
- 6+ environment variables
- 200+ lines of token management code
- Complex two-step authentication flow

### What You're Getting:
- Single-step Google login with YouTube permissions
- Automatic token refresh by Supabase
- Secure, encrypted token storage
- Clean, maintainable codebase
- Better user experience

## Final Architecture

### Authentication Flow:
```
User → Login Page → Supabase OAuth → Google Consent → Callback → Dashboard
         ↓                                                ↓
    (All scopes)                                  (Tokens stored by Supabase)
```

### Data Flow:
```
Supabase Auth → User Session → API Middleware → YouTube API
                      ↓              ↓
                (Auto refresh)  (Get tokens from Supabase)
```

### Database Structure:
```
users (simplified)
├── id
├── email
├── name
├── image
├── subscription info
└── timestamps

accounts (channel info only)
├── id
├── user_id
├── youtube_channel_id
├── youtube_channel_title
└── youtube_channel_thumbnail
```