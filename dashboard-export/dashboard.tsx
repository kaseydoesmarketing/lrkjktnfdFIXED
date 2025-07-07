import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Bell, Play, Plus, User, Clock, ChevronRight, RotateCcw, Eye, MousePointer, TrendingUp, TestTube, ChevronLeft } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

function DashboardContent() {
  const [currentTitleIndex, setCurrentTitleIndex] = useState(0);

  // Check for successful OAuth login and refresh auth state
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionToken = urlParams.get('sessionToken');
    
    if (sessionToken) {
      console.log('OAuth login successful, storing session token');
      localStorage.setItem('sessionToken', sessionToken);
      
      const url = new URL(window.location.href);
      url.searchParams.delete('sessionToken');
      window.history.replaceState({}, '', url.pathname);
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
  }, []);

  // Simplified queries to prevent crashes
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: !!localStorage.getItem('sessionToken'),
    retry: false,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
    retry: false,
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['/api/tests'],
    enabled: !!user,
    retry: false,
  });

  const { data: recentVideos = [] } = useQuery({
    queryKey: ['/api/videos/recent'],
    enabled: !!user,
    retry: false,
  });

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
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

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Active Tests Card */}
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

// Proper React Error Boundary wrapper
export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}