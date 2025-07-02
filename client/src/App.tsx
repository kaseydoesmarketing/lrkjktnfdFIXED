import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import Dashboard from "@/pages/dashboard-fixed";
import EnhancedAdmin from "@/pages/enhanced-admin";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Paywall from "@/pages/paywall";

import AuthCallback from "@/pages/auth-callback";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: () => authService.getCurrentUser(),
    retry: false,
  });

  console.log('AuthWrapper - user:', user, 'isLoading:', isLoading, 'error:', error);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    console.log('AuthWrapper error, redirecting to login:', error);
    return <Login />;
  }

  if (!user) {
    console.log('No user found, showing login');
    return <Login />;
  }

  console.log('User authenticated, showing dashboard');
  return <>{children}</>;
}

function Router() {
  return (
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
      <Route path="/privacy" component={() => <Privacy />} />
      <Route path="/terms" component={() => <Terms />} />
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
