import React, { useState, useEffect } from 'react';
import { Play, TestTube, TrendingUp, Target, Bell, LogOut, Video, Clock, Eye, Plus, X, Calendar, Settings, Zap, BarChart3, Users, ArrowUpRight, ChevronRight, Activity, Sparkles, Bot, Shield, Gauge, Layers } from 'lucide-react';

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

export default function DashboardFuturistic() {
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
  const [activeTab, setActiveTab] = useState('overview');

  // Authenticate user
  useEffect(() => {
    const authenticateUser = async () => {
      try {
        const token = localStorage.getItem('sessionToken');
        if (!token) {
          window.location.href = '/login';
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
        setAuthState({
          loading: false,
          authenticated: false,
          user: null,
          error: error instanceof Error ? error.message : 'Authentication failed'
        });
        localStorage.removeItem('sessionToken');
        window.location.href = '/login';
      }
    };

    authenticateUser();
  }, []);

  // Load dashboard data
  useEffect(() => {
    if (authState.authenticated) {
      loadDashboardData();
    }
  }, [authState.authenticated]);

  const loadDashboardData = async () => {
    const token = localStorage.getItem('sessionToken');
    if (!token) return;

    try {
      // Load stats
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load tests
      setIsLoadingTests(true);
      const testsResponse = await fetch('/api/tests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (testsResponse.ok) {
        const testsData = await testsResponse.json();
        setTests(testsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoadingTests(false);
    }
  };

  const loadVideos = async () => {
    const token = localStorage.getItem('sessionToken');
    if (!token) return;

    setIsLoadingVideos(true);
    try {
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

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('sessionToken');
      window.location.href = '/login';
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
        loadDashboardData();
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
        setTests(prev => prev.map(test => test.id === testId ? { ...test, status: status as Test['status'] } : test));
      }
    } catch (error) {
      console.error('Error updating test status:', error);
    }
  };

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-spin border-t-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-pulse bg-gradient-to-r from-blue-600/20 to-purple-600/20 mx-auto"></div>
          </div>
          <p className="text-gray-600 font-medium">Initializing TitleTesterPro</p>
          <p className="text-gray-400 text-sm mt-1">Preparing your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Futuristic Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  TitleTesterPro
                </h1>
                <p className="text-xs text-gray-500 -mt-1">AI-Powered Title Optimization</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 bg-gray-50 rounded-xl p-1">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'tests', label: 'Tests', icon: TestTube },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {authState.user?.name || authState.user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500">Pro Account</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {(authState.user?.name || authState.user?.email || 'U')[0].toUpperCase()}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back! 👋</h2>
              <p className="text-gray-600">Your titles are performing {stats.avgCtr > '4.0' ? 'exceptionally' : 'well'} with {stats.avgCtr}% average CTR</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{stats.activeTests}</p>
                <p className="text-sm text-gray-500">Active Tests</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Activity className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Futuristic Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: 'Active Tests',
              value: stats.activeTests,
              icon: TestTube,
              color: 'from-green-500 to-emerald-500',
              bgColor: 'from-green-50 to-emerald-50',
              trend: '+12%',
              description: 'Currently running'
            },
            {
              title: 'Total Views',
              value: formatViewCount(stats.totalViews),
              icon: Eye,
              color: 'from-blue-500 to-cyan-500',
              bgColor: 'from-blue-50 to-cyan-50',
              trend: '+18%',
              description: 'Across all tests'
            },
            {
              title: 'Average CTR',
              value: `${stats.avgCtr}%`,
              icon: Target,
              color: 'from-purple-500 to-pink-500',
              bgColor: 'from-purple-50 to-pink-50',
              trend: '+16%',
              description: 'Click-through rate'
            },
            {
              title: 'Tests Won',
              value: stats.testsWon,
              icon: TrendingUp,
              color: 'from-orange-500 to-red-500',
              bgColor: 'from-orange-50 to-red-50',
              trend: '+9%',
              description: 'Completed successfully'
            }
          ].map((stat, index) => (
            <div
              key={stat.title}
              className={`relative bg-gradient-to-br ${stat.bgColor} rounded-2xl p-6 border border-white shadow-sm hover:shadow-md transition-all duration-300 group`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{stat.trend}</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm font-medium text-gray-700">{stat.title}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>

              {/* Subtle animation overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity duration-700"></div>
            </div>
          ))}
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Create New Test Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Create New A/B Test</h3>
                  <p className="text-blue-100">Start optimizing your titles today</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Plus className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600">Ready to test your next viral title?</p>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>2 min setup</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowCreateTest(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <Sparkles className="w-5 h-5" />
                <span>Start New Test</span>
              </button>
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">AI Insights</h3>
                  <p className="text-purple-100">Powered by advanced analytics</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Title Performance</span>
                  <span className="text-green-600 font-medium">Excellent</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">CTR Optimization</span>
                  <span className="text-blue-600 font-medium">+47% Above Average</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Next Recommendation</span>
                  <span className="text-purple-600 font-medium">Test Emotional Hooks</span>
                </div>
              </div>
              
              <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl">
                <Activity className="w-5 h-5" />
                <span>View Full Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tests Overview */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Your Title Tests</h3>
                <p className="text-gray-600 mt-1">Monitor and manage your A/B tests</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">{tests.filter(t => t.status === 'active').length} Active</span>
                </div>
                <button
                  onClick={() => setShowCreateTest(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Test</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {isLoadingTests ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading your tests...</p>
                </div>
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TestTube className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No tests yet</h4>
                <p className="text-gray-600 mb-6">Create your first A/B test to start optimizing your titles</p>
                <button
                  onClick={() => setShowCreateTest(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Create Your First Test
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          test.status === 'active' ? 'bg-green-500 animate-pulse' :
                          test.status === 'paused' ? 'bg-yellow-500' :
                          test.status === 'completed' ? 'bg-blue-500' :
                          'bg-gray-400'
                        }`}></div>
                        <h4 className="font-medium text-gray-900">{test.videoTitle}</h4>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          test.status === 'active' ? 'bg-green-100 text-green-800' :
                          test.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                          test.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                        </span>
                        
                        {test.status === 'active' && (
                          <button
                            onClick={() => updateTestStatus(test.id, 'paused')}
                            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium hover:bg-yellow-200 transition-colors"
                          >
                            Pause
                          </button>
                        )}
                        
                        {test.status === 'paused' && (
                          <button
                            onClick={() => updateTestStatus(test.id, 'active')}
                            className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium hover:bg-green-200 transition-colors"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Title Variants</p>
                        <p className="font-medium text-gray-900">{test.titles.length} variants</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Rotation Interval</p>
                        <p className="font-medium text-gray-900">{test.rotationIntervalMinutes} minutes</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Success Metric</p>
                        <p className="font-medium text-gray-900">{test.winnerMetric.toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Test Modal */}
      {showCreateTest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Create New A/B Test</h3>
                  <p className="text-blue-100 mt-1">Optimize your titles with AI-powered testing</p>
                </div>
                <button
                  onClick={() => setShowCreateTest(false)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              {/* Video Selection */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Select Video</h4>
                {!selectedVideo ? (
                  <div>
                    <button
                      onClick={loadVideos}
                      disabled={isLoadingVideos}
                      className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                    >
                      {isLoadingVideos ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-gray-600">Loading videos...</span>
                        </div>
                      ) : (
                        <div>
                          <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 font-medium">Load Your Recent Videos</p>
                          <p className="text-gray-500 text-sm mt-1">Choose from your latest uploads</p>
                        </div>
                      )}
                    </button>

                    {videos.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                        {videos.map((video) => (
                          <div
                            key={video.id}
                            onClick={() => setSelectedVideo(video)}
                            className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-16 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{video.title}</p>
                              <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                                <span>{formatViewCount(video.viewCount)} views</span>
                                <span>{formatPublishedDate(video.publishedAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={selectedVideo.thumbnail}
                        alt={selectedVideo.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{selectedVideo.title}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatViewCount(selectedVideo.viewCount)} views • {formatPublishedDate(selectedVideo.publishedAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedVideo(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Title Variants */}
              {selectedVideo && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Title Variants</h4>
                    <button
                      onClick={addTitleInput}
                      disabled={titleInputs.length >= 5}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:text-gray-400"
                    >
                      + Add Variant ({titleInputs.length}/5)
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {titleInputs.map((title, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                              const newTitles = [...titleInputs];
                              newTitles[index] = e.target.value;
                              setTitleInputs(newTitles);
                            }}
                            placeholder={`Title variant ${index + 1}`}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        {titleInputs.length > 2 && (
                          <button
                            onClick={() => removeTitleInput(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Configuration */}
              {selectedVideo && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Test Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rotation Interval (minutes)
                      </label>
                      <select
                        value={testConfig.rotationIntervalMinutes}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, rotationIntervalMinutes: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                        <option value={240}>4 hours</option>
                        <option value={480}>8 hours</option>
                        <option value={1440}>24 hours</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Success Metric
                      </label>
                      <select
                        value={testConfig.winnerMetric}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, winnerMetric: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="ctr">Click-Through Rate (CTR)</option>
                        <option value="avd">Average View Duration</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCreateTest(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTest}
                  disabled={!selectedVideo || titleInputs.filter(t => t.trim()).length < 2 || isCreatingTest}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                >
                  {isCreatingTest ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Create Test</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}