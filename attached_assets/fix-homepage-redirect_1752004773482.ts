// client/src/App.tsx
import React, { useEffect, useState } from 'react';
import { Route, Switch, Router, Redirect, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from './lib/supabase';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tests from './pages/Tests';
import EnhancedAdmin from './pages/enhanced-admin';
import Paywall from './pages/paywall';
import AuthCallback from './pages/auth-callback';
import AuthTest from './pages/auth-test';
import Privacy from './pages/privacy';
import Terms from './pages/terms';
import NotFound from './pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Auth wrapper component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        setLoading(false);
        
        if (!session) {
          setLocation('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setLoading(false);
        setLocation('/login');
      }
    };

    checkAuth();
  }, [setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function AppRouter() {
  const [location, setLocation] = useLocation();
  const [initialAuthCheck, setInitialAuthCheck] = useState(true);

  useEffect(() => {
    // Only check auth on initial load, not on every route change
    if (initialAuthCheck) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setInitialAuthCheck(false);
        
        // Only redirect to dashboard if:
        // 1. User is authenticated
        // 2. They're on the login page
        // 3. NOT on the home page
        if (session && location === '/login') {
          setLocation('/dashboard');
        }
      });
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && location === '/login') {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        setLocation('/dashboard');
      } else if (event === 'SIGNED_OUT') {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        if (location !== '/') {
          setLocation('/login');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setLocation, location, initialAuthCheck]);

  return (
    <ErrorBoundary>
      <Switch>
        {/* Public Routes */}
        <Route path="/" component={HomePage} />
        <Route path="/login" component={Login} />
        <Route path="/paywall" component={Paywall} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/auth-test" component={AuthTest} />
        
        {/* Protected Routes */}
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
        
        {/* 404 */}
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
          <AppRouter />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;