import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import Dashboard from "@/pages/dashboard";
import EnhancedAdmin from "@/pages/enhanced-admin";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { HomePage } from "./pages/HomePage";
import Paywall from "@/pages/paywall";
import AuthCallback from "@/pages/auth-callback";
import OAuthTest from "@/pages/OAuthTest";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Tests from "@/pages/Tests";
import AuthTest from "@/pages/auth-test";
import AuthDiagnostic from "@/pages/auth-diagnostic";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: () => authService.getCurrentUser(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  console.log('🛡️ [AUTH-WRAPPER] Auth state:', {
    isLoading,
    hasError: !!error,
    hasUser: !!data,
    userEmail: data?.email
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show login if error or no user
  if (error || !data) {
    console.log('🚫 [AUTH-WRAPPER] No auth, showing login. Error:', error);
    return <Login />;
  }

  // User authenticated, render dashboard
  console.log('✅ [AUTH-WRAPPER] User authenticated, rendering protected content');
  return <>{children}</>;
}

function Router() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Handle Supabase auth on page load
    const handleAuthSession = async () => {
      try {
        // Check if we have hash fragments with tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
          console.log('🔑 Found access token in URL, establishing session...');
          
          // Set the session in Supabase
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (error) {
            console.error('❌ Error setting session:', error);
            setLocation('/login?error=session_error');
            return;
          }

          if (session) {
            console.log('✅ Session established in Supabase');
            
            // Send tokens to backend to set cookies
            console.log('🍪 Sending tokens to backend to set cookies');
            const response = await fetch('/api/auth/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken
              })
            });
            
            if (response.ok) {
              console.log('✅ Cookies set successfully');
              // Clear the hash from URL
              window.history.replaceState({}, '', window.location.pathname);
              // Redirect to dashboard
              setLocation('/dashboard');
              // Refresh the query client to update auth state
              queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
            } else {
              console.error('❌ Failed to set cookies');
              setLocation('/login?error=cookie_error');
            }
          }
        } else {
          // Check if we already have a session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('✅ Existing session found');
          }
        }
      } catch (error) {
        console.error('Auth session error:', error);
      }
    };

    handleAuthSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event);
      if (event === 'SIGNED_IN' && session) {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        setLocation('/dashboard');
      } else if (event === 'SIGNED_OUT') {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        setLocation('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setLocation]);

  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/dashboard">
          <AuthWrapper>
            <Dashboard />
          </AuthWrapper>
        </Route>
        <Route path="/tests">
          <AuthWrapper>
            <Tests />
          </AuthWrapper>
        </Route>
        <Route path="/admin">
          <AuthWrapper>
            <EnhancedAdmin />
          </AuthWrapper>
        </Route>
        <Route path="/paywall" component={Paywall} />
        <Route path="/login" component={Login} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/oauth-test" component={OAuthTest} />
        <Route path="/auth-test" component={() => <AuthTest />} />
        <Route path="/auth-diagnostic" component={() => <AuthDiagnostic />} />
        <Route path="/privacy" component={() => <Privacy />} />
        <Route path="/terms" component={() => <Terms />} />
        <Route path="/" component={HomePage} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
