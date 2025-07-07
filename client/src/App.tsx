import { Switch, Route } from "wouter";
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
import Home from "@/pages/home";
import Paywall from "@/pages/paywall";
import AuthCallback from "@/pages/auth-callback";
import OAuthTest from "@/pages/OAuthTest";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import ErrorBoundary from "@/components/ErrorBoundary";

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: () => authService.getCurrentUser(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  // Show error state
  if (error) {
    console.error('Authentication error:', error);
    return <Login />;
  }

  // Show login if no user
  if (!user) {
    return <Login />;
  }

  // User authenticated, render dashboard
  return <>{children}</>;
}

function Router() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/dashboard">
          <AuthWrapper>
            <Dashboard />
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
        <Route path="/privacy" component={() => <Privacy />} />
        <Route path="/terms" component={() => <Terms />} />
        <Route path="/" component={Home} />
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
