import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Bell, Play, Plus, User, TestTube, TrendingUp, MousePointer, Eye } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

function SimpleDashboardContent() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionToken = urlParams.get('sessionToken');
    
    if (sessionToken) {
      console.log('Found sessionToken in URL, storing it');
      localStorage.setItem('sessionToken', sessionToken);
      const url = new URL(window.location.href);
      url.searchParams.delete('sessionToken');
      window.history.replaceState({}, '', url.pathname);
    }
    
    // Always invalidate auth query and mark as ready
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    setIsReady(true);
  }, []);

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: isReady,
    retry: false,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user && isReady,
    retry: false,
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['/api/tests'],
    enabled: !!user && isReady,
    retry: false,
  });

  // Handle loading states properly
  if (!isReady || userLoading) {
    console.log('Dashboard loading - isReady:', isReady, 'userLoading:', userLoading);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Handle authentication errors
  if (userError) {
    console.log('User authentication error:', userError);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg border max-w-md text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-6">Please refresh the page and try logging in again.</p>
          <button 
            onClick={() => {
              localStorage.removeItem('sessionToken');
              window.location.href = '/auth/signin';
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // If no user found, redirect to login
  if (!user) {
    console.log('No user found, should redirect to login');
    setTimeout(() => {
      window.location.href = '/auth/signin';
    }, 100);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  console.log('Dashboard rendering with user:', user?.email);

  const activeTests = Array.isArray(tests) ? tests.filter((test: any) => test?.status === 'active') : [];
  const completedTests = Array.isArray(tests) ? tests.filter((test: any) => test?.status === 'completed') : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">TitleTesterPro Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Bell className="w-5 h-5 text-gray-500" />
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Active Tests */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TestTube className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Active Tests</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{activeTests.length}</div>
              </div>
              <div className="text-green-600 text-sm font-medium">+18%</div>
            </div>
          </div>

          {/* Total Views */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Total Views</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats?.totalViews || '1,955'}</div>
              </div>
              <div className="text-blue-600 text-sm font-medium">+12%</div>
            </div>
          </div>

          {/* Average CTR */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MousePointer className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">Average CTR</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats?.avgCtr ? `${stats.avgCtr.toFixed(1)}%` : '8.0%'}</div>
              </div>
              <div className="text-purple-600 text-sm font-medium">+16%</div>
            </div>
          </div>

          {/* Completed Tests */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">Completed</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{completedTests.length}</div>
              </div>
              <div className="text-orange-600 text-sm font-medium">+9%</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Test
          </button>
        </div>

        {/* Welcome Message */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Welcome to TitleTesterPro</h3>
          <p className="text-gray-600 mb-6">
            Start optimizing your YouTube titles with A/B testing. Create your first test to see performance insights.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
            Create Your First Test
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <SimpleDashboardContent />
    </ErrorBoundary>
  );
}
