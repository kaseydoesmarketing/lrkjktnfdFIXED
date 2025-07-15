import { createClient } from '@supabase/supabase-js';

// Debug environment variables
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.error('❌ VITE_SUPABASE_URL is not defined in environment variables');
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY is not defined in environment variables');
}

// Supabase configuration with better error handling
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyehwoacgpsxakhjwglq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZWh3b2FjZ3BzeGFraGp3Z2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NjMyMzYsImV4cCI6MjA2NzMzOTIzNn0.qmxeB9dFU1-KlAkjb-JrVFIj6IZZJZsmpDvTK-5QgkY';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are required. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function requestYouTubeScopes() {
  console.log('🎯 [YOUTUBE-SCOPES] Requesting YouTube API access');
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?youtube=true`,
        scopes: 'openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/yt-analytics.readonly',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true'
        }
      }
    });
    
    if (error) {
      console.error('❌ [YOUTUBE-SCOPES] Error requesting YouTube scopes:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('💥 [YOUTUBE-SCOPES] YouTube scope request failed:', error);
    throw error;
  }
}

// Helper function to get the current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
}

// Helper function to check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
