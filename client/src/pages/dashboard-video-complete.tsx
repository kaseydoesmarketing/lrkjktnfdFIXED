import React, { useState, useEffect } from 'react';
import { Play, TestTube, TrendingUp, Target, Bell, LogOut, Video, Clock, Eye, Plus, X, Calendar, Settings } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  duration: string;
  status: string;
}

interface Test {
  id: string;
  videoId: string;
  videoTitle: string;
  status: 'pending' | 'active' | 'paused' | 'completed';
  rotationIntervalMinutes: number;
  winnerMetric: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  titles: Title[];
}

interface Title {
  id: string;
  testId: string;
  text: string;
  order: number;
  activatedAt?: string;
}

interface Stats {
  activeTests: number;
  totalViews: number;
  avgCtr: string;
  testsWon: number;
}

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  user: User | null;
  error: string | null;
}

export default function DashboardVideoComplete() {
  const [authState, setAuthState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    user: null,
    error: null
  });

  const [videos, setVideos] = useState<Video[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [stats, setStats] = useState<Stats>({ activeTests: 0, totalViews: 0, avgCtr: '0.0', testsWon: 0 });
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [titleInputs, setTitleInputs] = useState(['', '', '']);
  const [testConfig, setTestConfig] = useState({
    rotationIntervalMinutes: 60,
    winnerMetric: 'ctr',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  // Authenticate user
  useEffect(() => {
    const authenticateUser = async () => {
      try {
        const token = localStorage.getItem('sessionToken');
        if (!token) {
          window.location.href = '/auth/signin';
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const user = await response.json();
        setAuthState({
          loading: false,
          authenticated: true,
          user,
          error: null
        });
      } catch (error) {
        console.error('Authentication error:', error);
        setAuthState({
          loading: false,
          authenticated: false,
          user: null,
          error: 'Authentication failed'
        });
        localStorage.removeItem('sessionToken');
        window.location.href = '/auth/signin';
      }
    };

    authenticateUser();
  }, []);

  // Load videos
  useEffect(() => {
    const loadVideos = async () => {
      if (!authState.authenticated) return;
      
      setIsLoadingVideos(true);
      try {
        const token = localStorage.getItem('sessionToken');
        const response = await fetch('/api/videos/recent', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const videosData = await response.json();
          setVideos(videosData);
        } else {
          console.error('Failed to load videos');
        }
      } catch (error) {
        console.error('Error loading videos:', error);
      } finally {
        setIsLoadingVideos(false);
      }
    };

    loadVideos();
  }, [authState.authenticated]);

  // Load tests and stats
  useEffect(() => {
    const loadTestsAndStats = async () => {
      if (!authState.authenticated) return;

      setIsLoadingTests(true);
      try {
        const token = localStorage.getItem('sessionToken');
        
        // Load tests
        const testsResponse = await fetch('/api/tests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (testsResponse.ok) {
          const testsData = await testsResponse.json();
          setTests(testsData);
        }

        // Load stats
        const statsResponse = await fetch('/api/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Error loading tests and stats:', error);
      } finally {
        setIsLoadingTests(false);
      }
    };

    loadTestsAndStats();
  }, [authState.authenticated]);

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
      window.location.href = '/auth/signin';
    }
  };

  const handleCreateTest = async () => {
    if (!selectedVideo || titleInputs.filter(t => t.trim()).length < 2) {
      alert('Please select a video and enter at least 2 titles');
      return;
    }

    setIsCreatingTest(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          videoId: selectedVideo.id,
          videoTitle: selectedVideo.title,
          titles: titleInputs.filter(t => t.trim()),
          ...testConfig
        })
      });

      if (response.ok) {
        const newTest = await response.json();
        setTests(prev => [newTest, ...prev]);
        setShowCreateTest(false);
        setSelectedVideo(null);
        setTitleInputs(['', '', '']);
        
        // Refresh stats
        const statsResponse = await fetch('/api/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      } else {
        alert('Failed to create test');
      }
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Error creating test');
    } finally {
      setIsCreatingTest(false);
    }
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatPublishedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const addTitleInput = () => {
    if (titleInputs.length < 5) {
      setTitleInputs([...titleInputs, '']);
    }
  };

  const removeTitleInput = (index: number) => {
    if (titleInputs.length > 2) {
      setTitleInputs(titleInputs.filter((_, i) => i !== index));
    }
  };

  const updateTestStatus = async (testId: string, status: string) => {
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch(`/api/tests/${testId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        const updatedTest = await response.json();
        setTests(prev => prev.map(test => test.id === testId ? { ...test, status } : test));
      }
    } catch (error) {
      console.error('Error updating test status:', error);
    }
  };

  if (authState.loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '3px solid #e5e7eb', 
            borderTop: '3px solid #dc2626',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
              Welcome, {authState.user?.name || authState.user?.email}
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
                  {stats.activeTests}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Running experiments
                </div>
              </div>
            </div>
          </div>

          {/* Total Views */}
          <div style={{
            backgroundColor: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Eye size={16} style={{ color: '#2563eb' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#2563eb' }}>Total Views</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>
                  {formatViewCount(stats.totalViews)}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Across all tests
                </div>
              </div>
            </div>
          </div>

          {/* Average CTR */}
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <TrendingUp size={16} style={{ color: '#d97706' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#d97706' }}>Average CTR</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>
                  {stats.avgCtr}%
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Click-through rate
                </div>
              </div>
            </div>
          </div>

          {/* Tests Won */}
          <div style={{
            backgroundColor: '#f3e8ff',
            border: '1px solid #c4b5fd',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Target size={16} style={{ color: '#7c3aed' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#7c3aed' }}>Tests Won</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>
                  {stats.testsWon}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Completed successfully
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Selection Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
              Select Video to Test
            </h2>
            {selectedVideo && (
              <button
                onClick={() => setShowCreateTest(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <Plus size={16} />
                Create A/B Test
              </button>
            )}
          </div>
          
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
            {isLoadingVideos ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                <Video size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p>Loading your recent videos...</p>
              </div>
            ) : videos.length > 0 ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {videos.slice(0, 5).map((video) => (
                  <div
                    key={video.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: selectedVideo?.id === video.id ? '#fef2f2' : 'white',
                      borderColor: selectedVideo?.id === video.id ? '#dc2626' : '#e5e7eb'
                    }}
                    onClick={() => setSelectedVideo(video)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img
                          src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                          alt="Video thumbnail"
                          style={{
                            width: '160px',
                            height: '90px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            backgroundColor: '#f3f4f6'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '4px',
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          color: 'white',
                          fontSize: '12px',
                          padding: '2px 6px',
                          borderRadius: '3px'
                        }}>
                          {video.duration}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          fontWeight: '500',
                          color: '#111827',
                          marginBottom: '8px',
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {video.title}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Eye size={14} />
                            <span>{formatViewCount(video.viewCount)} views</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} />
                            <span>{formatPublishedDate(video.publishedAt)}</span>
                          </div>
                        </div>
                        {selectedVideo?.id === video.id && (
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            fontSize: '12px',
                            borderRadius: '4px',
                            fontWeight: '500'
                          }}>
                            Selected for Testing
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                <Video size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p>No videos found. Please check your YouTube channel connection.</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Tests Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            Your A/B Tests
          </h2>
          
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
            {isLoadingTests ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                <TestTube size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p>Loading your tests...</p>
              </div>
            ) : tests.length > 0 ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {tests.map((test) => (
                  <div
                    key={test.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '20px',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                          {test.videoTitle}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#6b7280' }}>
                          <span>Video ID: {test.videoId}</span>
                          <span>•</span>
                          <span>Rotate every {test.rotationIntervalMinutes} minutes</span>
                          <span>•</span>
                          <span>Optimizing for {test.winnerMetric.toUpperCase()}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          padding: '4px 8px',
                          backgroundColor: test.status === 'active' ? '#dcfce7' : test.status === 'paused' ? '#fef3c7' : '#f3f4f6',
                          color: test.status === 'active' ? '#16a34a' : test.status === 'paused' ? '#d97706' : '#6b7280',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                        </div>
                        {test.status === 'active' && (
                          <button
                            onClick={() => updateTestStatus(test.id, 'paused')}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Pause
                          </button>
                        )}
                        {test.status === 'paused' && (
                          <button
                            onClick={() => updateTestStatus(test.id, 'active')}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      {test.titles.map((title, index) => (
                        <div
                          key={title.id}
                          style={{
                            padding: '12px',
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
                              Title {index + 1}
                            </span>
                            {title.activatedAt && (
                              <div style={{
                                padding: '2px 6px',
                                backgroundColor: '#dcfce7',
                                color: '#16a34a',
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: '500'
                              }}>
                                Active
                              </div>
                            )}
                          </div>
                          <p style={{ fontSize: '14px', color: '#111827', lineHeight: '1.4', margin: 0 }}>
                            {title.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                <TestTube size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p>No tests created yet. Select a video above to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Test Modal */}
      {showCreateTest && selectedVideo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '32px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Create A/B Test
              </h2>
              <button
                onClick={() => setShowCreateTest(false)}
                style={{
                  padding: '8px',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Selected Video Info */}
            <div style={{ 
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={selectedVideo.thumbnail}
                  alt="Video thumbnail"
                  style={{
                    width: '80px',
                    height: '45px',
                    objectFit: 'cover',
                    borderRadius: '4px'
                  }}
                />
                <div>
                  <h3 style={{ fontWeight: '500', color: '#111827', marginBottom: '4px', fontSize: '14px' }}>
                    {selectedVideo.title}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    {formatViewCount(selectedVideo.viewCount)} views • {formatPublishedDate(selectedVideo.publishedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Title Variants */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#111827', marginBottom: '12px' }}>
                Title Variants (2-5 required)
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {titleInputs.map((title, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder={`Title variant ${index + 1}`}
                      value={title}
                      onChange={(e) => {
                        const newTitles = [...titleInputs];
                        newTitles[index] = e.target.value;
                        setTitleInputs(newTitles);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    {titleInputs.length > 2 && (
                      <button
                        onClick={() => removeTitleInput(index)}
                        style={{
                          padding: '8px',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {titleInputs.length < 5 && (
                  <button
                    onClick={addTitleInput}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#f3f4f6',
                      border: '1px dashed #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}
                  >
                    <Plus size={14} />
                    Add Title Variant
                  </button>
                )}
              </div>
            </div>

            {/* Test Configuration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                  Rotation Interval (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="1440"
                  value={testConfig.rotationIntervalMinutes}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, rotationIntervalMinutes: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                  Success Metric
                </label>
                <select
                  value={testConfig.winnerMetric}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, winnerMetric: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="ctr">Click-Through Rate (CTR)</option>
                  <option value="avd">Average View Duration</option>
                </select>
              </div>
            </div>

            {/* Date Range */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={testConfig.startDate}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, startDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={testConfig.endDate}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, endDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateTest(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTest}
                disabled={isCreatingTest || titleInputs.filter(t => t.trim()).length < 2}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isCreatingTest ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isCreatingTest ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {isCreatingTest ? 'Creating...' : 'Create Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
