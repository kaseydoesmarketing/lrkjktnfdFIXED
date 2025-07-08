import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthTest() {
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toTimeString().split(' ')[0]} - ${message}`]);
  };

  const testSupabaseSession = async () => {
    addLog('🔍 Testing Supabase session...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      addLog(`❌ Supabase error: ${error.message}`);
    } else if (session) {
      addLog(`✅ Supabase session found: ${session.user.email}`);
      addLog(`📅 Expires at: ${new Date(session.expires_at! * 1000).toLocaleString()}`);
    } else {
      addLog('❌ No Supabase session found');
    }
  };

  const testBackendAuth = async () => {
    addLog('🔍 Testing backend /api/auth/user...');
    
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      addLog(`📡 Response status: ${response.status}`);
      
      const data = await response.json();
      if (response.ok) {
        addLog(`✅ Backend auth successful: ${data.user.email}`);
      } else {
        addLog(`❌ Backend auth failed: ${data.error}`);
      }
    } catch (error) {
      addLog(`💥 Backend request error: ${error}`);
    }
  };

  const checkCookies = () => {
    addLog('🍪 Checking cookies...');
    const cookies = document.cookie;
    if (cookies) {
      const cookieList = cookies.split(';').map(c => c.trim());
      cookieList.forEach(cookie => {
        const [name] = cookie.split('=');
        if (name.includes('sb-') || name.includes('session')) {
          addLog(`  Cookie found: ${name}`);
        }
      });
      if (!cookieList.some(c => c.includes('sb-access-token'))) {
        addLog('  ❌ No sb-access-token cookie found');
      }
    } else {
      addLog('  ❌ No cookies found');
    }
  };

  const testFullAuth = async () => {
    setLogs([]);
    addLog('🚀 Starting full authentication test...');
    addLog('');
    
    // 1. Check cookies
    checkCookies();
    addLog('');
    
    // 2. Check Supabase session
    await testSupabaseSession();
    addLog('');
    
    // 3. Check backend auth
    await testBackendAuth();
    addLog('');
    
    addLog('✅ Test complete');
  };

  const clearSession = async () => {
    addLog('🧹 Clearing all sessions...');
    await supabase.auth.signOut();
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    });
    addLog('✅ Sessions cleared');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Authentication System Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <Button onClick={testFullAuth}>Run Full Test</Button>
                <Button onClick={testSupabaseSession} variant="outline">Test Supabase</Button>
                <Button onClick={testBackendAuth} variant="outline">Test Backend</Button>
                <Button onClick={checkCookies} variant="outline">Check Cookies</Button>
                <Button onClick={clearSession} variant="destructive">Clear Session</Button>
              </div>
              
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Test Logs:</h3>
                <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-gray-500">Click a button to start testing...</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="whitespace-pre-wrap">{log}</div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2">Test Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Click "Run Full Test" to check all authentication components</li>
                  <li>If no session exists, go to login page and sign in with Google</li>
                  <li>After login, return here and run the test again</li>
                  <li>All tests should show green checkmarks when properly authenticated</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}