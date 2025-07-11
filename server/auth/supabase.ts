import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables');
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }
);

// Helper to get YouTube tokens from Supabase session
export async function getYouTubeTokens(accessToken: string) {
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    throw new Error('Invalid session');
  }
  
  // Get the Google OAuth tokens from user metadata
  const providerToken = user.app_metadata.provider_token;
  const providerRefreshToken = user.app_metadata.provider_refresh_token;
  
  if (!providerToken) {
    throw new Error('No YouTube access token found');
  }
  
  return {
    accessToken: providerToken,
    refreshToken: providerRefreshToken,
    userId: user.id,
    email: user.email
  };
}