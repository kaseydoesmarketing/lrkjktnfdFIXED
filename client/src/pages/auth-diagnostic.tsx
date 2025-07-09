import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

interface DiagnosticResult {
  test: string;
  status: 'pending' | 'checking' | 'success' | 'error';
  message?: string;
  details?: any;
}

export default function AuthDiagnosticTool() {
  const { user } = useAuthStore();
  const [results, setResults] = useState<DiagnosticResult[]>([
    { test: 'Supabase Session', status: 'pending' },
    { test: 'Backend Authentication', status: 'pending' },
    { test: 'YouTube API Connection', status: 'pending' },
    { test: 'Video Fetch Test', status: 'pending' }
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (test: string, update: Partial<DiagnosticResult>) => {
    setResults(prev => prev.map(r => 
      r.test === test ? { ...r, ...update } : r
    ));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    
    // Test 1: Check Supabase Session
    updateResult('Supabase Session', { status: 'checking' });
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        updateResult('Supabase Session', { 
          status: 'error', 
          message: 'No active session',
          details: error 
        });
      } else {
        updateResult('Supabase Session', { 
          status: 'success', 
          message: `Logged in as ${session.user.email}`,
          details: {
            userId: session.user.id,
            email: session.user.email,
            hasProviderToken: !!session.provider_token,
            hasRefreshToken: !!session.provider_refresh_token,
            expiresAt: new Date(session.expires_at! * 1000).toLocaleString()
          }
        });
      }
    } catch (error) {
      updateResult('Supabase Session', { 
        status: 'error', 
        message: 'Failed to check session',
        details: error 
      });
    }

    // Test 2: Check Backend Authentication
    updateResult('Backend Authentication', { status: 'checking' });
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        updateResult('Backend Authentication', { 
          status: 'error', 
          message: `HTTP ${response.status}: ${response.statusText}` 
        });
      } else {
        const data = await response.json();
        updateResult('Backend Authentication', { 
          status: 'success', 
          message: 'Backend authenticated',
          details: data.user
        });
      }
    } catch (error) {
      updateResult('Backend Authentication', { 
        status: 'error', 
        message: 'Failed to reach backend',
        details: error 
      });
    }

    // Test 3: Check YouTube API Connection
    updateResult('YouTube API Connection', { status: 'checking' });
    try {
      const response = await fetch('/api/auth/youtube-status', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        updateResult('YouTube API Connection', { 
          status: 'error', 
          message: 'YouTube not connected' 
        });
      } else {
        const data = await response.json();
        updateResult('YouTube API Connection', { 
          status: 'success', 
          message: 'YouTube API connected',
          details: data
        });
      }
    } catch (error) {
      updateResult('YouTube API Connection', { 
        status: 'error', 
        message: 'Failed to check YouTube status',
        details: error 
      });
    }

    // Test 4: Try fetching videos
    updateResult('Video Fetch Test', { status: 'checking' });
    try {
      const response = await fetch('/api/videos/channel?limit=1', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        updateResult('Video Fetch Test', { 
          status: 'error', 
          message: errorData.error || `HTTP ${response.status}`,
          details: errorData
        });
      } else {
        const videos = await response.json();
        updateResult('Video Fetch Test', { 
          status: 'success', 
          message: `Found ${videos.length} video(s)`,
          details: videos[0] || 'No videos found'
        });
      }
    } catch (error) {
      updateResult('Video Fetch Test', { 
        status: 'error', 
        message: 'Failed to fetch videos',
        details: error 
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full bg-gray-200" />;
      case 'checking':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Diagnostic Tool</CardTitle>
          <CardDescription>
            Run diagnostics to check the authentication and YouTube API connection status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Diagnostics
              </>
            )}
          </Button>

          <div className="space-y-3">
            {results.map((result) => (
              <div key={result.test} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <h3 className="font-medium">{result.test}</h3>
                    {result.message && (
                      <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    )}
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-sm text-gray-500 cursor-pointer">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!user && (
            <Alert>
              <AlertDescription>
                You need to be logged in to run the full diagnostics. 
                <a href="/login" className="text-blue-600 hover:underline ml-1">
                  Login here
                </a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}