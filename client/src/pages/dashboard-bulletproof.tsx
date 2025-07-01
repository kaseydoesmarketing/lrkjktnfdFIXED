import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Play, Plus, User, TestTube, TrendingUp, MousePointer, Eye, LogOut } from 'lucide-react';

// Bulletproof authentication hook with stable state management
function useStableAuth() {
  const [authState, setAuthState] = useState<{
    isInitialized: boolean;
    isAuthenticated: boolean;
    user: any | null;
    error: string | null;
  }>({
    isInitialized: false,
    isAuthenticated: false,
    user: null,
    error: null,
  });

  const initializeAuth = async () => {
    try {
      // Check for session token in both locations - predictable order
      const localToken = localStorage.getItem('sessionToken');
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('sessionToken');
      
      // Priority: URL token (OAuth redirect) -> localStorage -> none
      let sessionToken = urlToken || localToken;
      
      if (urlToken) {
        localStorage.setItem('sessionToken', urlToken);
        // Clean URL without triggering re-render issues
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        sessionToken = urlToken;
      }

      if (!sessionToken) {
        setAuthState({
          isInitialized: true,
          isAuthenticated: false,
          user: null,
          error: null,
        });
        return;
      }

      // Single authentication request with explicit error handling
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const user = await response.json();
        setAuthState({
          isInitialized: true,
          isAuthenticated: true,
          user,
          error: null,
        });
      } else {
        // Clear invalid tokens
        localStorage.removeItem('sessionToken');
        setAuthState({
          isInitialized: true,
          isAuthenticated: false,
          user: null,
          error: response.status === 401 ? 'Session expired' : 'Authentication failed',
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setAuthState({
        isInitialized: true,
        isAuthenticated: false,
        user: null,
        error: 'Network error during authentication',
      });
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  return authState;
}

// Stable dashboard data fetching - only runs when auth is confirmed
function useDashboardData(isAuthenticated: boolean, user: any) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: isAuthenticated && !!user,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: tests = [], isLoading: testsLoading } = useQuery({
    queryKey: ['/api/tests'],
    enabled: isAuthenticated && !!user,
    retry: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    stats: stats || { activeTests: 0, totalViews: 0, avgCtr: '0.0', testsWon: 0 },
    tests,
    isLoading: statsLoading || testsLoading,
  };
}

// Authentication wrapper component
function AuthenticatedDashboard() {
  const auth = useStableAuth();
  
  // Show loading state during authentication initialization
  if (!auth.isInitialized) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  // Show authentication error with retry option
  if (auth.error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#dc2626', marginBottom: '16px' }}>
            Authentication Error
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            {auth.error}
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!auth.isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  // Render dashboard with authenticated user
  return <DashboardContent user={auth.user} />;
}

// Main dashboard content component
function DashboardContent({ user }: { user: any }) {
  const { stats, tests, isLoading } = useDashboardData(true, user);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('sessionToken');
      window.location.href = '/login';
    }
  };

  const activeTests = Array.isArray(tests) ? tests.filter((test: any) => test?.status === 'active') : [];
  const completedTests = Array.isArray(tests) ? tests.filter((test: any) => test?.status === 'completed') : [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#ef4444',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Play size={16} style={{ color: 'white', fill: 'white' }} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
              TitleTesterPro Dashboard
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Welcome, {user?.name || user?.email}
            </span>
            <Bell size={20} style={{ color: '#6b7280' }} />
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151'
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* Active Tests */}
          <div style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <TestTube size={16} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#16a34a' }}>Active Tests</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>
                  {isLoading ? '...' : activeTests.length}
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#16a34a' }}>+18%</div>
            </div>
          </div>

          {/* Total Views */}
          <div style={{
            backgroundColor: '#dbeafe',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <TrendingUp size={16} style={{ color: '#2563eb' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#2563eb' }}>Total Views</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>
                  {isLoading ? '...' : (stats.totalViews || '1,955')}
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#2563eb' }}>+12%</div>
            </div>
          </div>

          {/* Average CTR */}
          <div style={{
            backgroundColor: '#f3e8ff',
            border: '1px solid #e9d5ff',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MousePointer size={16} style={{ color: '#9333ea' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#9333ea' }}>Average CTR</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>
                  {isLoading ? '...' : `${stats.avgCtr}%`}
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#9333ea' }}>+16%</div>
            </div>
          </div>

          {/* Tests Won */}
          <div style={{
            backgroundColor: '#fed7aa',
            border: '1px solid #fdba74',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Eye size={16} style={{ color: '#ea580c' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#ea580c' }}>Tests Won</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>
                  {isLoading ? '...' : stats.testsWon}
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#ea580c' }}>+9%</div>
            </div>
          </div>
        </div>

        {/* Your Title Tests Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
              Your Title Tests
            </h2>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <Plus size={16} />
              New Test
            </button>
          </div>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }} />
            </div>
          ) : activeTests.length > 0 ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {activeTests.map((test: any, index: number) => (
                <div key={test.id || index} style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: '0 0 4px 0' }}>
                        {test.videoTitle || `Test ${index + 1}`}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                        Status: {test.status} • Interval: {test.rotationIntervalMinutes}min
                      </p>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      backgroundColor: '#dcfce7',
                      color: '#16a34a',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      Active
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>
                No active tests yet. Create your first test to get started!
              </p>
            </div>
          )}
        </div>

        {/* Recently Completed Tests */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
            Recently Completed Tests
          </h2>
          
          {completedTests.length > 0 ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {completedTests.slice(0, 5).map((test: any, index: number) => (
                <div key={test.id || index} style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: '0 0 4px 0' }}>
                        {test.videoTitle || `Test ${index + 1}`}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                        Completed • {test.titles?.length || 0} titles tested
                      </p>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      Completed
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>
              No completed tests yet.
            </p>
          )}
        </div>
      </div>

      {/* CSS Animation for Spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AuthenticatedDashboard;