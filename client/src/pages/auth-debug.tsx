import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthDebug() {
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState<Record<string, any>>({});

  const runTests = async () => {
    setLoading(true);
    const results: Record<string, any> = {};

    // Test 1: Check Supabase session
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      results.supabaseSession = {
        success: !!session,
        data: session ? { user: session.user.email, expiresAt: session.expires_at } : null,
        error: error?.message
      };
    } catch (error) {
      results.supabaseSession = { success: false, error: String(error) };
    }

    // Test 2: Check cookies
    try {
      const cookies = document.cookie.split(';').map(c => c.trim());
      const sbAccessToken = cookies.find(c => c.startsWith('sb-access-token='));
      const sbRefreshToken = cookies.find(c => c.startsWith('sb-refresh-token='));
      results.cookies = {
        success: true,
        data: {
          hasAccessToken: !!sbAccessToken,
          hasRefreshToken: !!sbRefreshToken,
          allCookies: cookies.map(c => c.split('=')[0])
        }
      };
    } catch (error) {
      results.cookies = { success: false, error: String(error) };
    }

    // Test 3: Check backend auth
    try {
      const response = await fetch('/api/auth/user', { credentials: 'include' });
      const data = await response.json();
      results.backendAuth = {
        success: response.ok,
        status: response.status,
        data: response.ok ? data : null,
        error: !response.ok ? data.error : null
      };
    } catch (error) {
      results.backendAuth = { success: false, error: String(error) };
    }

    // Test 4: Check current URL
    results.urlInfo = {
      success: true,
      data: {
        href: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        hasTokens: window.location.hash.includes('access_token')
      }
    };

    setTests(results);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const handleLogin = () => {
    window.location.href = '/auth/signin';
  };

  const handleDirectLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth-debug`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    if (error) console.error('Login error:', error);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-x-4">
            <Button onClick={runTests} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running Tests</> : 'Run Tests'}
            </Button>
            <Button onClick={handleLogin} variant="outline">
              Go to Login Page
            </Button>
            <Button onClick={handleDirectLogin} variant="outline">
              Direct OAuth Login (Debug)
            </Button>
          </CardContent>
        </Card>

        {Object.entries(tests).map(([name, result]) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{name}</span>
                {result.success ? 
                  <Check className="w-5 h-5 text-green-600" /> : 
                  <X className="w-5 h-5 text-red-600" />
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
