import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import Dashboard from './components/Dashboard';
import ExtensionSetup from './components/ExtensionSetup';
import AuthCallback from './components/AuthCallback';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Switch>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/extension-setup" component={ExtensionSetup} />
          <Route path="/auth/callback" component={AuthCallback} />
          <Route path="/" component={Dashboard} />
        </Switch>
      </Router>
    </QueryClientProvider>
  );
}
