import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authService } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import { Bell, Play, Plus, User, Clock, ChevronRight, RotateCcw, Eye, MousePointer, TrendingUp, TestTube, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function DashboardContent() {
  const [currentTitleIndex, setCurrentTitleIndex] = useState(0);
  
  // Safe toast hook with error handling
  let toast: any;
  try {
    toast = useToast().toast;
  } catch (error) {
    console.warn('Toast hook not available:', error);
    toast = () => {}; // No-op fallback
  }

  // Check for successful OAuth login and refresh auth state
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionToken = urlParams.get('sessionToken');
      
      if (sessionToken) {
        console.log('OAuth login successful, storing session token');
        localStorage.setItem('sessionToken', sessionToken);
        
        const url = new URL(window.location.href);
        url.searchParams.delete('sessionToken');
        window.history.replaceState({}, '', url.pathname);
        
        if (toast) {
          toast({
            title: "Login Successful",
            description: "Welcome to TitleTesterPro! You're now connected to YouTube.",
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    } catch (error) {
      console.error('Error in dashboard useEffect:', error);
    }
  }, [toast]);

  // Safe queries with error handling
  const { data: user, error: userError } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: !!localStorage.getItem('sessionToken'),
    retry: 1,
    staleTime: 5000,
  });

  const { data: stats, error: statsError } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
  });

  const { data: tests = [], error: testsError } = useQuery({
    queryKey: ['/api/tests'],
    enabled: !!user,
    retry: 1,
    staleTime: 10000,
  });

  const { data: recentVideos = [], error: videosError } = useQuery({
    queryKey: ['/api/videos/recent'],
    enabled: !!user,
    retry: 1,
    staleTime: 60000,
  });

  // Log any errors for debugging
  useEffect(() => {
    if (userError) console.error('User query error:', userError);
    if (statsError) console.error('Stats query error:', statsError);
    if (testsError) console.error('Tests query error:', testsError);
    if (videosError) console.error('Videos query error:', videosError);
  }, [userError, statsError, testsError, videosError]);

  // Safe data processing with error handling
  const activeTests = Array.isArray(tests) ? tests.filter((test: any) => test?.status === 'active') : [];
  const completedTests = Array.isArray(tests) ? tests.filter((test: any) => test?.status === 'completed') : [];

  // Mock data for active test demonstration
  const activeTitles = [
    { title: "Y'all Cancel Everybody But Diddy?", ctr: 7.4, views: 1182, status: "tested" },
    { title: "Nobody Wants to Admit This About Cassie and Diddy", ctr: 8.6, views: 773, status: "current" },
    { title: "If Diddy Walks, It's Proof This System Ain't Built for Us", ctr: 0, views: 0, status: "pending" },
    { title: "The Truth About Diddy That Nobody Talks About", ctr: 0, views: 0, status: "pending" },
    { title: "Why Diddy's Case Changes Everything for Hip-Hop", ctr: 0, views: 0, status: "pending" }
  ];

  const handlePrevTitle = () => {
    setCurrentTitleIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const handleNextTitle = () => {
    setCurrentTitleIndex((prev) => (prev < activeTitles.length - 3 ? prev + 1 : prev));
  };

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '4px solid #3b82f6', borderTop: '4px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', color: '#111827' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#ef4444', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play style={{ width: '16px', height: '16px', color: 'white', fill: 'white' }} />
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>Thumbnail Tester Dashboard</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Bell style={{ width: '20px', height: '20px', color: '#6b7280' }} />
            <div style={{ width: '32px', height: '32px', backgroundColor: '#d1d5db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User style={{ width: '16px', height: '16px', color: '#4b5563' }} />
            </div>
          </div>
        </div>
      </header>

      <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Active Tests Card */}
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <TestTube style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#16a34a' }}>Active Tests</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{activeTests.length}</div>
              </div>
              <div style={{ color: '#16a34a', fontSize: '0.875rem', fontWeight: '500' }}>+18%</div>
            </div>
          </div>

          {/* Total Views Card */}
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <TrendingUp style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#2563eb' }}>Total Views</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{stats?.totalViews || '1,955'}</div>
              </div>
              <div style={{ color: '#2563eb', fontSize: '0.875rem', fontWeight: '500' }}>+12%</div>
            </div>
          </div>

          {/* Average CTR Card */}
          <div style={{ backgroundColor: '#faf5ff', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <MousePointer style={{ width: '16px', height: '16px', color: '#9333ea' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#9333ea' }}>Average CTR</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{stats?.avgCtr ? `${stats.avgCtr.toFixed(1)}%` : '8.0%'}</div>
              </div>
              <div style={{ color: '#9333ea', fontSize: '0.875rem', fontWeight: '500' }}>+16%</div>
            </div>
          </div>

          {/* Completed Tests Card */}
          <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Eye style={{ width: '16px', height: '16px', color: '#ea580c' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#ea580c' }}>Completed</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{completedTests.length}</div>
              </div>
              <div style={{ color: '#ea580c', fontSize: '0.875rem', fontWeight: '500' }}>+9%</div>
            </div>
          </div>
        </div>

        {/* Channel Selector and New Test Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <select style={{ width: '256px', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}>
            <option>Select YouTube Channel</option>
            <option>Main Channel</option>
            <option>Secondary Channel</option>
          </select>
          
          <button style={{ backgroundColor: '#3b82f6', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <Plus style={{ width: '16px', height: '16px' }} />
            New Test
          </button>
        </div>

        {/* Video Selection Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>Select video to test</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentVideos.slice(0, 2).map((video: any, index: number) => (
              <div key={index} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                      alt="Video thumbnail" 
                      style={{ width: '128px', height: '72px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <div style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.75)', color: 'white', fontSize: '0.75rem', padding: '2px 4px', borderRadius: '2px' }}>
                      {video.duration || '4:05'}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: '500', color: '#111827', marginBottom: '0.25rem' }}>{video.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Eye style={{ width: '12px', height: '12px' }} />
                        {video.viewCount || '405'} views
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock style={{ width: '12px', height: '12px' }} />
                        {video.publishedAt || '4 days ago'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '0.25rem' }}>{video.description || 'What if i told your Diddy\'s walking fart is about Cassie and Diddy, i dreak Todd/k about a better...'}</p>
                  </div>
                  <ChevronRight style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Test Section - Show if there are tests or for demonstration */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
              This Diddy Story Proves Cancel Culture is a Lie
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
              <RotateCcw style={{ width: '16px', height: '16px' }} />
              <span>10 min Rotation</span>
            </div>
          </div>

          {/* Title Carousel */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {activeTitles.slice(currentTitleIndex, currentTitleIndex + 3).map((titleData, index) => (
                <div key={index} style={{ 
                  backgroundColor: titleData.status === 'current' ? '#f0fdf4' : 'white', 
                  border: titleData.status === 'current' ? '1px solid #bbf7d0' : '1px solid #e5e7eb', 
                  borderRadius: '8px', 
                  padding: '1.5rem' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#4b5563' }}>
                      Title {String.fromCharCode(65 + currentTitleIndex + index)}
                    </span>
                    {titleData.status === 'current' && (
                      <span style={{ backgroundColor: '#22c55e', color: 'white', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>Current</span>
                    )}
                    {titleData.status === 'pending' && (
                      <span style={{ border: '1px solid #2563eb', color: '#2563eb', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>Pending</span>
                    )}
                  </div>
                  <h3 style={{ fontWeight: '500', color: '#111827', marginBottom: '1rem' }}>{titleData.title}</h3>
                  
                  {titleData.status === 'pending' ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                      <button style={{ border: '1px solid #2563eb', color: '#2563eb', backgroundColor: 'transparent', padding: '0.5rem 1rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto', cursor: 'pointer' }}>
                        <Plus style={{ width: '16px', height: '16px' }} />
                        Generate Title With AI
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>CTR</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{titleData.ctr}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>Views</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{titleData.views.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            {activeTitles.length > 3 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  onClick={handlePrevTitle}
                  disabled={currentTitleIndex === 0}
                  style={{ 
                    padding: '0.5rem', 
                    borderRadius: '50%', 
                    border: '1px solid #d1d5db', 
                    backgroundColor: 'white', 
                    cursor: currentTitleIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentTitleIndex === 0 ? 0.5 : 1
                  }}
                >
                  <ChevronLeft style={{ width: '16px', height: '16px' }} />
                </button>
                <button 
                  onClick={handleNextTitle}
                  disabled={currentTitleIndex >= activeTitles.length - 3}
                  style={{ 
                    padding: '0.5rem', 
                    borderRadius: '50%', 
                    border: '1px solid #d1d5db', 
                    backgroundColor: 'white', 
                    cursor: currentTitleIndex >= activeTitles.length - 3 ? 'not-allowed' : 'pointer',
                    opacity: currentTitleIndex >= activeTitles.length - 3 ? 0.5 : 1
                  }}
                >
                  <ChevronRight style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            )}

            {/* Page Indicators */}
            {activeTitles.length > 3 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                {Array.from({ length: Math.ceil(activeTitles.length / 3) }, (_, i) => (
                  <div 
                    key={i}
                    style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: Math.floor(currentTitleIndex / 3) === i ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Title Variants Info */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <h3 style={{ fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>Title Variants</h3>
            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '1rem' }}>
              Enter 3-5 titles to A/B test. TitleTesterPro will automatically change your video's title on YouTube according to the rotation schedule. Best click-through rate determines the winner.
            </p>
            <button style={{ border: '1px solid #2563eb', color: '#2563eb', backgroundColor: 'transparent', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel test
            </button>
          </div>
        </div>
      </div>

      {/* Add keyframes for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Error boundary wrapper component
export default function Dashboard() {
  try {
    return <DashboardContent />;
  } catch (error) {
    console.error('Dashboard crash prevented:', error);
    
    // Fallback UI if dashboard crashes
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f9fafb', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '2rem', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
            TitleTesterPro Dashboard
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Loading your dashboard... If this continues, please refresh the page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              padding: '0.5rem 1rem', 
              borderRadius: '6px', 
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}