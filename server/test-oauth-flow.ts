import { createClient } from '@supabase/supabase-js';

// Test script to verify Supabase OAuth configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://xyehwoacgpsxakhjwglq.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZWh3b2FjZ3BzeGFraGp3Z2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NjMyMzYsImV4cCI6MjA2NzMzOTIzNn0.qmxeB9dFU1-KlAkjb-JrVFIj6IZZJZsmpDvTK-5QgkY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testOAuthConfiguration() {
  console.log('🔍 Testing Supabase OAuth Configuration\n');
  
  console.log('1. Supabase Project Details:');
  console.log(`   - URL: ${supabaseUrl}`);
  console.log(`   - Project ID: xyehwoacgpsxakhjwglq`);
  console.log('');
  
  console.log('2. OAuth Callback URL for Google Cloud Console:');
  console.log(`   https://xyehwoacgpsxakhjwglq.supabase.co/auth/v1/callback`);
  console.log('');
  
  console.log('3. Required Google OAuth Scopes:');
  const scopes = [
    'openid',
    'email', 
    'profile',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];
  scopes.forEach(scope => console.log(`   - ${scope}`));
  console.log('');
  
  console.log('4. OAuth URL Construction:');
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent('http://localhost:5000/auth/callback')}&scopes=${encodeURIComponent(scopes.join(' '))}&access_type=offline&prompt=consent`;
  console.log(`   ${authUrl}`);
  console.log('');
  
  console.log('5. Known Supabase Limitations:');
  console.log('   - Provider tokens (access_token, refresh_token) are NOT included in the session by default');
  console.log('   - Supabase stores provider tokens internally but doesn\'t expose them in client sessions');
  console.log('   - To access YouTube API, we need to:');
  console.log('     a) Use Supabase Admin API to retrieve provider tokens (requires service role key)');
  console.log('     b) Or implement a custom OAuth flow alongside Supabase auth');
  console.log('');
  
  console.log('6. Solution Options:');
  console.log('   Option 1: Use Supabase Admin API on backend to get provider tokens');
  console.log('   Option 2: Implement parallel OAuth flow to capture tokens directly');
  console.log('   Option 3: Use Supabase Edge Functions to proxy YouTube API calls');
  console.log('');
  
  // Test if we can get provider tokens using service role
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('7. Testing Service Role Access to Provider Tokens...');
    const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    // Note: This would require a user ID to test
    console.log('   Service role key is available for backend token retrieval');
  }
}

testOAuthConfiguration();