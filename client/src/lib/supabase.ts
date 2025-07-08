import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://xyehwoacgpsxakhjwglq.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZWh3b2FjZ3BzeGFraGp3Z2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NjMyMzYsImV4cCI6MjA2NzMzOTIzNn0.qmxeB9dFU1-KlAkjb-JrVFIj6IZZJZsmpDvTK-5QgkY'
);

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