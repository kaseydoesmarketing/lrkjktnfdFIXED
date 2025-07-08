# Authentication Flow Analysis and Fix

## Current Issue
The authentication flow is broken - users cannot log in because:
1. OAuth redirects to homepage with tokens in URL hash
2. App.tsx tries to handle tokens and set cookies
3. But cookies are never actually set on the server
4. /api/auth/user always returns 401 because no cookies exist

## Root Cause
The OAuth callback from Google goes to `/api/auth/callback/google` on the backend, which:
1. Exchanges code for session
2. Sets cookies directly
3. Redirects to /dashboard

BUT Supabase OAuth is redirecting to the frontend with hash tokens instead!

## The Fix
We need to ensure the OAuth flow works correctly:
1. Google OAuth → Backend callback → Set cookies → Redirect to dashboard
2. OR: Google OAuth → Frontend with tokens → Send to backend → Set cookies → Dashboard

## Current Flow (BROKEN)
1. User clicks login
2. Redirects to /api/auth/google
3. Supabase initiates OAuth with redirectTo: `${currentDomain}/auth/callback`
4. Google returns to frontend /auth/callback with hash tokens
5. Frontend tries to handle but cookies never get set properly

## Fixed Flow (WORKING)
1. Change Supabase redirect to backend: `/api/auth/callback/google`
2. Backend handles OAuth callback, sets cookies
3. Redirects to dashboard with cookies already set