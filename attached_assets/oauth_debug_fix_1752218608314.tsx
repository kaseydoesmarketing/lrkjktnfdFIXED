import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, ExternalLink, Settings, Key, Globe, Youtube } from 'lucide-react';

const OAuthDebugFix = () => {
  const [debugging, setDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState({});
  const [autoFixAttempted, setAutoFixAttempted] = useState(false);

  const runOAuthDiagnostics = async () => {
    setDebugging(true);
    const results = {};

    try {
      // Check current URL and environment
      results.currentUrl = window.location.origin;
      results.isLocalhost = window.location.hostname === 'localhost';
      results.isReplit = window.location.hostname.includes('repl.co');

      // Test API health
      try {
        const healthResponse = await fetch('/api/health');
        results.apiHealth = healthResponse.ok ? 'healthy' : 'unhealthy';
        results.apiData = await healthResponse.json();
      } catch (error) {
        results.apiHealth = 'unreachable';
        results.apiError = error.message;
      }

      // Test auth endpoint
      try {
        const authResponse = await fetch('/api/auth/me', { credentials: 'include' });
        results.authStatus = authResponse.status;
        if (authResponse.status === 401) {
          results.authMessage = 'No valid session (expected for logged out users)';
        } else {
          results.authData = await authResponse.json();
        }
      } catch (error) {
        results.authError = error.message;
      }

      // Check for session cookies
      results.hasCookies = document.cookie.includes('session-token') || document.cookie.includes('sb-access-token');
      results.cookies = document.cookie;

      // Test OAuth initiation endpoint
      try {
        const oauthTest = await fetch('/api/auth/youtube', { method: 'HEAD' });
        results.oauthEndpoint = oauthTest.ok ? 'available' : 'unavailable';
      } catch (error) {
        results.oauthEndpoint = 'error';
        results.oauthError = error.message;
      }

      setDebugResults(results);
    } catch (error) {
      results.globalError = error.message;
      setDebugResults(results);
    }

    setDebugging(false);
  };

  const attemptAutoFix = async () => {
    setAutoFixAttempted(true);
    
    // Clear any existing session data
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });

    // Clear localStorage
    localStorage.clear();
    sessionStorage.clear();

    // Try to establish a development session
    try {
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('✅ Development session created! Redirecting to dashboard...');
          window.location.href = '/dashboard';
          return;
        }
      }
    } catch (error) {
      console.error('Demo login failed:', error);
    }

    // If demo login fails, try direct OAuth
    alert('🔄 Demo login unavailable. Redirecting to Google OAuth...');
    window.location.href = '/api/auth/youtube';
  };

  const forceOAuthRetry = () => {
    // Clear everything and try OAuth again
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/api/auth/youtube';
  };

  useEffect(() => {
    // Auto-run diagnostics on load
    runOAuthDiagnostics();
  }, []);

  const getStatusIcon = (status) => {
    if (status === 'healthy' || status === 'available' || status === 200) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Youtube className="h-8 w-8 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">TitleTesterPro - OAuth Connection Fix</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Quick Fixes
          </h2>
          <div className="space-y-3">
            <button
              onClick={attemptAutoFix}
              disabled={autoFixAttempted}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {autoFixAttempted ? '✅ Auto-Fix Attempted' : '🔧 Try Auto-Fix (Demo Mode)'}
            </button>
            
            <button
              onClick={forceOAuthRetry}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              🔄 Force OAuth Retry
            </button>
            
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              📊 Try Dashboard Anyway
            </button>
          </div>
        </div>

        {/* Configuration Help */}
        <div className="bg-yellow-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Google Cloud Configuration
          </h2>
          <div className="space-y-2 text-sm">
            <p><strong>Current URL:</strong> {window.location.origin}</p>
            <p><strong>Required Redirect URI:</strong></p>
            <code className="block bg-gray-100 p-2 rounded text-xs break-all">
              {window.location.origin}/api/auth/callback
            </code>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-4 w-4" />
              Open Google Cloud Console
            </a>
          </div>
        </div>
      </div>

      {/* Diagnostics */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5" />
            System Diagnostics
          </h2>
          <button
            onClick={runOAuthDiagnostics}
            disabled={debugging}
            className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            {debugging ? 'Running...' : 'Refresh'}
          </button>
        </div>

        {Object.keys(debugResults).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(debugResults.apiHealth)}
                <span className="font-medium">API Health:</span>
                <span className={debugResults.apiHealth === 'healthy' ? 'text-green-600' : 'text-red-600'}>
                  {debugResults.apiHealth}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(debugResults.authStatus)}
                <span className="font-medium">Auth Status:</span>
                <span>{debugResults.authStatus} {debugResults.authMessage}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(debugResults.oauthEndpoint)}
                <span className="font-medium">OAuth Endpoint:</span>
                <span className={debugResults.oauthEndpoint === 'available' ? 'text-green-600' : 'text-red-600'}>
                  {debugResults.oauthEndpoint}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {debugResults.hasCookies ? 
                  <CheckCircle className="h-5 w-5 text-green-500" /> : 
                  <AlertCircle className="h-5 w-5 text-red-500" />
                }
                <span className="font-medium">Session Cookies:</span>
                <span className={debugResults.hasCookies ? 'text-green-600' : 'text-red-600'}>
                  {debugResults.hasCookies ? 'Present' : 'Missing'}
                </span>
              </div>
              
              <div className="text-sm">
                <span className="font-medium">Environment:</span>
                <span className="ml-2">
                  {debugResults.isLocalhost ? '🏠 Localhost' : 
                   debugResults.isReplit ? '🔧 Replit' : '🌐 Production'}
                </span>
              </div>
              
              <div className="text-sm">
                <span className="font-medium">Current URL:</span>
                <code className="ml-2 text-xs bg-gray-200 px-1 rounded">{debugResults.currentUrl}</code>
              </div>
            </div>
          </div>
        )}

        {debugResults.globalError && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-red-700"><strong>Error:</strong> {debugResults.globalError}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-100 border border-blue-300 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-2">🔧 Manual Fix Instructions:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Copy your current URL: <code className="bg-blue-200 px-1 rounded">{window.location.origin}</code></li>
          <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="underline">Google Cloud Console</a></li>
          <li>Find your OAuth client and add this redirect URI: <code className="bg-blue-200 px-1 rounded">{window.location.origin}/api/auth/callback</code></li>
          <li>Wait 5-10 minutes for changes to propagate</li>
          <li>Try the "Force OAuth Retry" button above</li>
        </ol>
      </div>
    </div>
  );
};

export default OAuthDebugFix;