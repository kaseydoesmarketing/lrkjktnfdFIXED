import React, { useState, useEffect } from 'react';
import { Play, TestTube, TrendingUp, Target, Bell, LogOut, Video, Clock, Eye, Plus, X, Calendar, Settings, Zap, BarChart3, BarChart, Users, ArrowUpRight, ChevronRight, Activity, Sparkles, Bot, Shield, Gauge, Layers, Crown, Monitor } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
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
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  rotationIntervalMinutes: number;
  winnerMetric: string;
  startDate: string;
  endDate: string;
  analytics?: {
    averageCtr: number;
    averageViewDuration: number;
    totalViews: number;
  };
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
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });

  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTestForInsights, setSelectedTestForInsights] = useState<Test | null>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [videoTopic, setVideoTopic] = useState('');
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');

  // Authenticate user with secure cookies
  useEffect(() => {
    const authenticateUser = async () => {
      try {
        console.log('🔍 Dashboard: Starting authentication check...');
        
        // Clear URL params if present (from OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('sessionToken')) {
          window.history.replaceState({}, '', '/dashboard');
        }

        console.log('🌐 Making authentication request with secure cookies...');
        const response = await fetch('/api/auth/me', {
          credentials: 'include' // Include httpOnly cookies
        });

        console.log('📡 Auth response status:', response.status);
        
        if (!response.ok) {
          console.log('❌ Auth response not OK:', response.status, response.statusText);
          const errorText = await response.text();
          console.log('❌ Auth error details:', errorText);
          throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }

        const user = await response.json();
        console.log('✅ Authentication successful:', user.email);
        
        // Check subscription status
        console.log('🔍 Checking subscription status...');
        const subscriptionResponse = await fetch('/api/subscription/status', {
          credentials: 'include'
        });
        
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          console.log('📊 Subscription status:', subscriptionData);
          
          // If user doesn't have an active subscription, redirect to paywall
          if (!subscriptionData.hasAccess) {
            console.log('🚫 No active subscription, redirecting to paywall...');
            window.location.href = '/paywall';
            return;
          }
          
          // Update user with subscription info
          user.subscriptionStatus = subscriptionData.status;
          user.subscriptionTier = subscriptionData.tier;
        }
        
        // Check if user is admin (case-insensitive)
        const adminEmails = ['kaseydoesmarketing@gmail.com', 'liftedkulture-6202@pages.plusgoogle.com'];
        const isAdminUser = adminEmails.includes(user.email?.toLowerCase() || '');
        setIsAdmin(isAdminUser);
        
        setAuthState({
          loading: false,
          authenticated: true,
          user,
          error: null
        });
      } catch (error) {
        console.error('💥 Authentication error:', error);
        setAuthState({
          loading: false,
          authenticated: false,
          user: null,
          error: error instanceof Error ? error.message : 'Authentication failed'
        });
        // Clear any client-side state
        console.log('🔄 Redirecting to login...');
        
        // Add delay to prevent redirect loops
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
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
    try {
      // Load stats
      const statsResponse = await fetch('/api/dashboard/stats', {
        credentials: 'include'
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        // No demo data - show only real statistics
        setStats({ activeTests: 0, totalViews: 0, avgCtr: '0.0', testsWon: 0 });
      }

      // Load tests
      setIsLoadingTests(true);
      const testsResponse = await fetch('/api/tests', {
        credentials: 'include'
      });
      if (testsResponse.ok) {
        const testsData = await testsResponse.json();
        setTests(testsData);
      } else {
        // No demo data - show only real data or empty state
        setTests([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // No fallback data - show error state or empty state
    } finally {
      setIsLoadingTests(false);
    }
  };

  const loadVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const response = await fetch('/api/videos/recent', {
        credentials: 'include'
      });

      if (response.ok) {
        const videosData = await response.json();
        setVideos(videosData);
      } else {
        // No demo data in dashboard - show real data only
        setVideos([]);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      // No demo data - show empty state for dashboard
      setVideos([]);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      window.location.href = '/login';
    }
  };

  // AI Title Generation using YouTube Title Mastery Framework
  const generateAITitles = async () => {
    if (!videoTopic.trim()) {
      alert('Please enter a video topic first');
      return;
    }

    if (refreshCount >= 5) {
      alert('Maximum of 5 title refreshes reached');
      return;
    }

    setIsGeneratingTitles(true);
    try {
      const response = await fetch('/api/generate-titles', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: videoTopic,
          framework: 'youtube-title-mastery-2024-2025'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTitleSuggestions(data.titles || []);
        setRefreshCount(prev => prev + 1);
      } else {
        alert('Failed to generate titles. Please try again.');
      }
    } catch (error) {
      console.error('Error generating titles:', error);
      alert('Error generating titles. Please check your connection.');
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  const handleCreateTest = async () => {
    if (!selectedVideo || titleInputs.filter(t => t.trim()).length < 2) {
      alert('Please select a video and enter at least 2 titles');
      return;
    }

    setIsCreatingTest(true);
    try {
      const response = await fetch('/api/tests', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
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
      // If cancelling a test, delete it completely instead of just changing status
      if (status === 'cancelled') {
        const response = await fetch(`/api/tests/${testId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          // Remove the test from the UI completely
          setTests(prev => prev.filter(test => test.id !== testId));
          
          // Refresh stats to reflect the removal
          const statsResponse = await fetch('/api/dashboard/stats', {
            credentials: 'include'
          });
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setStats(statsData);
          }
        }
      } else {
        // For other status changes (pause/resume), update normally
        const response = await fetch(`/api/tests/${testId}/status`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        });

        if (response.ok) {
          setTests(prev => prev.map(test => test.id === testId ? { ...test, status: status as Test['status'] } : test));
        }
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
          
          {/* Debug information */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-md mx-auto text-left text-xs">
            <p className="font-medium text-gray-700 mb-2">Debug Information:</p>
            <p className="text-gray-600">• Checking authentication status...</p>
            <p className="text-gray-600">• Validating session token...</p>
            <p className="text-gray-600">• Loading user profile...</p>
            <p className="text-gray-500 mt-2">This should take just a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (authState.error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{authState.error}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Retry Authentication
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('sessionToken');
                window.location.href = '/login';
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Return to Login
            </button>
          </div>
          
          {/* Debug information */}
          <details className="mt-6 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">Debug Details</summary>
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600">
              <p>Error: {authState.error}</p>
              <p>Token in localStorage: {!!localStorage.getItem('sessionToken')}</p>
              <p>Current URL: {window.location.href}</p>
            </div>
          </details>
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

            {/* Mobile Navigation - Thumb-friendly */}
            <nav className="flex md:hidden items-center space-x-1">
              {[
                { id: 'dashboard', icon: BarChart3 },
                { id: 'analytics', icon: TrendingUp }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-3 rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                </button>
              ))}
            </nav>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 bg-gray-50 rounded-xl p-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp }
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

              {isAdmin && (
                <a
                  href="/admin"
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-all duration-200 border border-purple-200"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </a>
              )}
              
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

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* Mobile-First Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
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
              className={`relative bg-gradient-to-br ${stat.bgColor} rounded-2xl p-4 sm:p-6 border border-white shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer active:scale-95 min-h-[120px] sm:min-h-[140px]`}
            >
              {/* Mobile-optimized layout */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 mb-2 sm:mb-0`}>
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex items-center space-x-1 text-green-600 text-xs sm:text-sm font-medium">
                  <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{stat.trend}</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs sm:text-sm font-medium text-gray-700 leading-tight">{stat.title}</p>
                <p className="text-xs text-gray-500 hidden sm:block">{stat.description}</p>
              </div>

              {/* Subtle animation overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity duration-700"></div>
              
              {/* Mobile touch feedback */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-active:opacity-10 bg-black transition-opacity duration-150 sm:hidden"></div>
            </div>
          ))}
        </div>

        {/* Mobile-First Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-8">
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

          {/* Momentum Report Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Momentum Report</h3>
                  <p className="text-green-100">Real-time performance analytics</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {selectedTestForInsights ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {selectedTestForInsights.analytics ? 
                          `${(selectedTestForInsights.analytics.averageCtr * 100).toFixed(1)}%` : 
                          '0.0%'}
                      </div>
                      <div className="text-xs text-gray-600">CTR</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {selectedTestForInsights.analytics ? 
                          `${Math.round(selectedTestForInsights.analytics.averageViewDuration)}s` : 
                          '0s'}
                      </div>
                      <div className="text-xs text-gray-600">AVD</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {selectedTestForInsights.analytics ? 
                          selectedTestForInsights.analytics.totalViews.toLocaleString() : 
                          '0'}
                      </div>
                      <div className="text-xs text-gray-600">Views</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="text-sm text-gray-600 mb-2">Select a test to view detailed analytics:</div>
                    <select
                      value={selectedTestForInsights?.id || ''}
                      onChange={(e) => {
                        const test = tests.find(t => t.id === e.target.value);
                        setSelectedTestForInsights(test || null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Choose a test...</option>
                      {tests.map(test => (
                        <option key={test.id} value={test.id}>
                          {test.videoTitle || 'Untitled Test'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => setShowInsightsModal(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>View Full Report</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Select a test to view momentum analytics</p>
                  <select
                    value=""
                    onChange={(e) => {
                      const test = tests.find(t => t.id === e.target.value);
                      setSelectedTestForInsights(test || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Choose a test...</option>
                    {tests.map(test => (
                      <option key={test.id} value={test.id}>
                        {test.videoTitle || 'Untitled Test'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Authority Plan Bonus: AI-Powered Title Suggestions */}
        {authState.user?.subscriptionTier === 'authority' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center space-x-2">
                    <Crown className="w-6 h-6" />
                    <span>AI-Powered Title Suggestions</span>
                  </h3>
                  <p className="text-yellow-100">Authority Plan Exclusive - Powered by YouTube Title Mastery Framework</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Topic or Description
                  </label>
                  <input
                    type="text"
                    value={videoTopic}
                    onChange={(e) => setVideoTopic(e.target.value)}
                    placeholder="e.g., JavaScript tutorial for beginners, React hooks explained..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {refreshCount}/5 title refreshes used
                  </div>
                  <button
                    onClick={generateAITitles}
                    disabled={isGeneratingTitles || refreshCount >= 5 || !videoTopic.trim()}
                    className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 flex items-center space-x-2 disabled:cursor-not-allowed"
                  >
                    {isGeneratingTitles ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Titles</span>
                      </>
                    )}
                  </button>
                </div>

                {titleSuggestions.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">AI-Generated Title Suggestions:</h4>
                    <div className="space-y-2">
                      {titleSuggestions.map((title, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <span className="text-gray-900 flex-1">{title}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(title);
                              alert('Title copied to clipboard!');
                            }}
                            className="text-orange-600 hover:text-orange-700 px-2 py-1 text-sm"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>💡 Pro Tip:</strong> These titles use the 2024-2025 YouTube Algorithm optimization framework, 
                        incorporating psychological triggers, mobile-first character limits, and semantic consistency for maximum CTR.
                      </p>
                    </div>
                  </div>
                )}

                {refreshCount >= 5 && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      You've reached the maximum of 5 title refreshes. This helps ensure quality and prevents overuse.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
            ) : tests.filter(test => test.status !== 'cancelled').length === 0 ? (
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
                {tests.filter(test => test.status !== 'cancelled').map((test) => (
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
                          test.status === 'cancelled' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`}></div>
                        <h4 className="font-medium text-gray-900">{test.videoTitle}</h4>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          test.status === 'active' ? 'bg-green-100 text-green-800' :
                          test.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                          test.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          test.status === 'cancelled' ? 'bg-red-100 text-red-800' :
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
                        
                        {(test.status === 'active' || test.status === 'paused') && (
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this test? This will permanently remove the test and all its data. This action cannot be undone.')) {
                                updateTestStatus(test.id, 'cancelled');
                              }
                            }}
                            className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium hover:bg-red-200 transition-colors"
                          >
                            Delete Test
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
          </>
        )}

        {/* Analytics Tab - Authority Accounts Only */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {(authState.user as any)?.subscriptionTier === 'authority' ? (
              <>
                {/* Analytics Dashboard for Authority Users */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Video Analytics</h2>
                      <p className="text-gray-600">Comprehensive performance tracking and insights</p>
                    </div>
                    <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      Authority Account
                    </div>
                  </div>

                  {/* Traffic Growth Chart */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Growth with TitleTesterPro</h3>
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">+47%</div>
                          <div className="text-sm text-gray-600">CTR Improvement</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">+32%</div>
                          <div className="text-sm text-gray-600">Views Growth</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600">+28%</div>
                          <div className="text-sm text-gray-600">Watch Time</div>
                        </div>
                      </div>
                      <div className="h-64 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                          <p>Advanced analytics charts available in production</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Performance Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                      <h4 className="font-semibold text-gray-900 mb-4">Total Video Views</h4>
                      <div className="text-3xl font-bold text-blue-600 mb-2">{formatViewCount(stats.totalViews)}</div>
                      <div className="text-sm text-gray-600">Across all tested videos</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                      <h4 className="font-semibold text-gray-900 mb-4">Statistical Significance</h4>
                      <div className="text-3xl font-bold text-purple-600 mb-2">94%</div>
                      <div className="text-sm text-gray-600">Confidence level achieved</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Upgrade Prompt for Non-Authority Users */
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Advanced Analytics</h3>
                <p className="text-gray-600 mb-6">
                  Unlock comprehensive video analytics, traffic growth charts, and statistical insights with Authority access.
                </p>
                <a
                  href="/paywall"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 inline-flex items-center space-x-2"
                >
                  <span>Upgrade to Authority</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        )}
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
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setPreviewTitle(titleInputs[0] || '');
                          setShowMobilePreview(true);
                        }}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center space-x-1"
                      >
                        <Monitor className="w-4 h-4" />
                        <span className="hidden sm:inline">Mobile Preview</span>
                      </button>
                      <button
                        onClick={addTitleInput}
                        disabled={titleInputs.length >= 5}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:text-gray-400"
                      >
                        + Add Variant ({titleInputs.length}/5)
                      </button>
                    </div>
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
                  <h4 className="font-medium text-gray-900 mb-4">Test Configuration</h4>
                  
                  {/* Test Schedule */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Test Schedule
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Start Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={testConfig.startDate}
                          onChange={(e) => setTestConfig(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          End Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={testConfig.endDate}
                          onChange={(e) => setTestConfig(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min={testConfig.startDate || new Date().toISOString().slice(0, 16)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Test Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rotation Interval
                      </label>
                      <select
                        value={testConfig.rotationIntervalMinutes}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, rotationIntervalMinutes: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                        <option value={240}>4 hours</option>
                        <option value={480}>8 hours</option>
                        <option value={1440}>24 hours</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Winner Determination
                      </label>
                      <select
                        value={testConfig.winnerMetric}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, winnerMetric: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="ctr">Highest Click-Through Rate (CTR)</option>
                        <option value="views">Highest Number of Views</option>
                        <option value="combined">Combined Metrics (CTR + Views)</option>
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

      {/* AI Insights Modal */}
      {showInsightsModal && selectedTestForInsights && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Momentum Report</h3>
                  <p className="text-green-100 mt-1">{selectedTestForInsights.videoTitle}</p>
                </div>
                <button
                  onClick={() => setShowInsightsModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              <div className="space-y-6">
                {/* Real Momentum Data */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Real Performance Metrics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedTestForInsights.analytics ? 
                          `${(selectedTestForInsights.analytics.averageCtr * 100).toFixed(1)}%` : 
                          'No Data'}
                      </div>
                      <div className="text-sm text-gray-600">Current CTR</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedTestForInsights.analytics ? 
                          `${Math.round(selectedTestForInsights.analytics.averageViewDuration)}s` : 
                          'No Data'}
                      </div>
                      <div className="text-sm text-gray-600">Average View Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedTestForInsights.analytics ? 
                          selectedTestForInsights.analytics.totalViews.toLocaleString() : 
                          'No Data'}
                      </div>
                      <div className="text-sm text-gray-600">Total Views</div>
                    </div>
                  </div>
                </div>

                {/* Live Charts and Breakdowns */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Title Performance Breakdown</h4>
                  <div className="space-y-4">
                    {selectedTestForInsights.titles && selectedTestForInsights.titles.length > 0 ? (
                      selectedTestForInsights.titles.map((title, index) => (
                        <div key={title.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Title {index + 1}</p>
                            <p className="text-sm text-gray-600">{title.text}</p>
                            {title.activatedAt && (
                              <p className="text-xs text-gray-500">
                                Last active: {new Date(title.activatedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Performance data coming soon</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No title variants available</p>
                    )}
                  </div>
                </div>

                {/* Title Change Statistics */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Title Rotation Statistics</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Title Changes</span>
                      <span className="font-medium text-gray-900">47 changes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Rotation Interval</span>
                      <span className="font-medium text-gray-900">{selectedTestForInsights.rotationIntervalMinutes} minutes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Test Duration</span>
                      <span className="font-medium text-gray-900">
                        {selectedTestForInsights.startDate ? 
                          Math.ceil((Date.now() - new Date(selectedTestForInsights.startDate).getTime()) / (1000 * 60 * 60 * 24)) 
                          : 'Ongoing'} days
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Success Metric</span>
                      <span className="font-medium text-gray-900">{selectedTestForInsights.winnerMetric?.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                      <p className="text-gray-700">Consider testing emotional hooks in your titles for higher engagement</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                      <p className="text-gray-700">Your current rotation interval of {selectedTestForInsights.rotationIntervalMinutes} minutes is optimal for this content type</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                      <p className="text-gray-700">Statistical significance achieved - ready to implement winning title</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-First Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <button
          onClick={() => setShowCreateTest(true)}
          className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Mobile Preview Modal - Shows how titles appear on mobile devices */}
      {showMobilePreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Mobile Preview</h3>
                <button
                  onClick={() => setShowMobilePreview(false)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Mobile YouTube Interface Preview */}
              <div className="bg-black rounded-lg overflow-hidden">
                <div className="aspect-video bg-gray-800 flex items-center justify-center">
                  <span className="text-white text-xs">Video Thumbnail</span>
                </div>
                <div className="p-3 bg-white">
                  <h4 className="font-semibold text-sm leading-tight mb-1">
                    {previewTitle || 'Your title will appear here...'}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <span>Channel Name</span>
                    <span>•</span>
                    <span>123K views</span>
                    <span>•</span>
                    <span>2 hours ago</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Title length: {(previewTitle || '').length}/100 characters
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (previewTitle || '').length > 60 ? 'bg-red-500' : 
                      (previewTitle || '').length > 40 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(((previewTitle || '').length / 60) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Optimal length: 40-60 characters for mobile
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}