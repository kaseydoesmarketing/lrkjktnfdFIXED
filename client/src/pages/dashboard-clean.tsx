import React, { useState, useEffect } from 'react';
import { Play, TestTube, TrendingUp, Target, Bell, LogOut, Video, Clock, Eye, Plus, X, Calendar, Settings, Zap, BarChart3, BarChart, Users, ArrowUpRight, ChevronRight, Activity, Sparkles, Bot, Shield, Gauge, Layers, Crown, Monitor } from 'lucide-react';
import MomentumReport from '@/components/MomentumReport';
import IntegratedCreateTestModal from '@/components/IntegratedCreateTestModal';

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

export default function DashboardClean() {
  const [authState, setAuthState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    user: null,
    error: null
  });

  const [videos, setVideos] = useState<Video[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [stats, setStats] = useState<Stats>({ activeTests: 0, totalViews: 0, avgCtr: '0.0', testsWon: 0 });
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Three integrated features state
  const [showMomentumReport, setShowMomentumReport] = useState(false);
  const [selectedTestForMomentum, setSelectedTestForMomentum] = useState<string | null>(null);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [videoTopic, setVideoTopic] = useState('');
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  // Authentication check
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        setAuthState({
          loading: false,
          authenticated: true,
          user: userData,
          error: null
        });
        
        // Load dashboard data
        loadTests();
        loadStats();
      } else {
        setAuthState({
          loading: false,
          authenticated: false,
          user: null,
          error: 'Authentication required'
        });
      }
    } catch (error) {
      setAuthState({
        loading: false,
        authenticated: false,
        user: null,
        error: 'Failed to authenticate'
      });
    }
  };

  const loadTests = async () => {
    try {
      const response = await fetch('/api/tests', {
        credentials: 'include'
      });
      if (response.ok) {
        const testsData = await response.json();
        setTests(testsData);
      }
    } catch (error) {
      console.error('Error loading tests:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include'
      });
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Feature 1: Claude-powered AI title generation
  const generateAITitles = async () => {
    if (!videoTopic.trim() || refreshCount >= 5) return;

    setIsGeneratingTitles(true);
    try {
      const response = await fetch('/api/generate-titles', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoTopic: videoTopic.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setTitleSuggestions(data.titles || []);
        setRefreshCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error generating titles:', error);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // Feature 2: Claude-powered momentum analysis
  const openMomentumReport = async (testId: string) => {
    setSelectedTestForMomentum(testId);
    setShowMomentumReport(true);
  };

  // Feature 3: Claude-powered winner selection with analysis
  const selectWinningTitle = async (testId: string, titleId: string) => {
    try {
      // Get Claude analysis for the winner selection
      const analysisResponse = await fetch('/api/analyze-winner-selection', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testId, selectedTitleId: titleId })
      });

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        console.log('Claude Winner Analysis:', analysisData.analysis);
      }

      // Complete the test
      const response = await fetch(`/api/tests/${testId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'completed' })
      });

      if (response.ok) {
        setTests(prev => prev.map(test => 
          test.id === testId ? { ...test, status: 'completed' as Test['status'] } : test
        ));
        setShowMomentumReport(false);
        loadStats();
      }
    } catch (error) {
      console.error('Error selecting winning title:', error);
    }
  };

  const updateTestStatus = async (testId: string, status: string) => {
    try {
      const response = await fetch(`/api/tests/${testId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setTests(prev => prev.map(test => 
          test.id === testId ? { ...test, status: status as Test['status'] } : test
        ));
      }
    } catch (error) {
      console.error('Error updating test status:', error);
    }
  };

  const deleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;

    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setTests(prev => prev.filter(test => test.id !== testId));
      }
    } catch (error) {
      console.error('Error deleting test:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  };

  // Helper functions
  const formatViewCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!authState.authenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access your dashboard</p>
          <a
            href="/login"
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  TitleTesterPro
                </h1>
                <p className="text-xs text-gray-500 -mt-1">AI-Powered Title Optimization</p>
              </div>
            </div>

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

            <div className="flex items-center space-x-4">
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
        {activeTab === 'dashboard' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {[
                {
                  title: 'Active Tests',
                  value: stats.activeTests,
                  icon: TestTube,
                  color: 'from-green-500 to-emerald-500',
                  bgColor: 'from-green-50 to-emerald-50',
                  trend: '+12%'
                },
                {
                  title: 'Total Views',
                  value: formatViewCount(stats.totalViews),
                  icon: Eye,
                  color: 'from-blue-500 to-cyan-500',
                  bgColor: 'from-blue-50 to-cyan-50',
                  trend: '+18%'
                },
                {
                  title: 'Average CTR',
                  value: `${stats.avgCtr}%`,
                  icon: Target,
                  color: 'from-purple-500 to-pink-500',
                  bgColor: 'from-purple-50 to-pink-50',
                  trend: '+16%'
                },
                {
                  title: 'Tests Won',
                  value: stats.testsWon,
                  icon: TrendingUp,
                  color: 'from-orange-500 to-red-500',
                  bgColor: 'from-orange-50 to-red-50',
                  trend: '+9%'
                }
              ].map((stat, index) => (
                <div
                  key={stat.title}
                  className={`relative bg-gradient-to-br ${stat.bgColor} rounded-2xl p-6 border border-white shadow-sm hover:shadow-md transition-all duration-300`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
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
                  </div>
                </div>
              ))}
            </div>

            {/* Action Cards - Three Integrated Features */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Feature 1: Create New Test with AI */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold mb-2">Create AI Test</h3>
                      <p className="text-blue-100 text-sm">Smart title generation</p>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Plus className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-gray-600 mb-4 text-sm">Generate optimized titles with Claude AI</p>
                  <button
                    onClick={() => setShowCreateTest(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Start Test</span>
                  </button>
                </div>
              </div>

              {/* Feature 2: Momentum Report */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold mb-2">Momentum Report</h3>
                      <p className="text-green-100 text-sm">Real-time analytics</p>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <select
                      value={selectedTestForMomentum || ''}
                      onChange={(e) => e.target.value && openMomentumReport(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Choose a test...</option>
                      {tests.filter(test => test.status === 'active' || test.status === 'paused').map(test => (
                        <option key={test.id} value={test.id}>
                          {test.videoTitle} ({test.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {!selectedTestForMomentum && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Select a test for AI insights</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Feature 3: AI Title Generator */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold mb-2">AI Titles</h3>
                      <p className="text-yellow-100 text-sm">Generate viral titles</p>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Crown className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <button
                    onClick={() => setShowTitleSuggestions(!showTitleSuggestions)}
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Bot className="w-4 h-4" />
                    <span>Generate Titles</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Title Suggestions Panel */}
            {showTitleSuggestions && (
              <div className="mb-8 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">AI-Powered Title Suggestions</h3>
                    <p className="text-orange-700">Powered by Claude AI & YouTube Algorithm Framework</p>
                  </div>
                </div>
                
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Your Title Tests */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Title Tests</h2>

              {tests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                  <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tests yet</h3>
                  <p className="text-gray-500 mb-6">Create your first A/B test to start optimizing titles</p>
                  <button
                    onClick={() => setShowCreateTest(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create Test</span>
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {tests.map((test) => (
                    <div key={test.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{test.videoTitle}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              test.status === 'active' ? 'bg-green-100 text-green-800' :
                              test.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                              test.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {test.status}
                            </span>
                            <span>{test.rotationIntervalMinutes} min rotation</span>
                            <span>{test.titles.length} titles</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openMomentumReport(test.id)}
                            className="text-green-600 hover:text-green-700 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors"
                            title="View AI Analysis"
                          >
                            <Bot className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTest(test.id)}
                            className="text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Test"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Performance Summary */}
                      {test.analytics && (
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {(test.analytics.averageCtr * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-600">CTR</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {Math.round(test.analytics.averageViewDuration)}s
                            </div>
                            <div className="text-xs text-gray-600">AVD</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">
                              {test.analytics.totalViews.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-600">Views</div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => openMomentumReport(test.id)}
                          className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <Bot className="w-4 h-4" />
                          <span>AI Analysis</span>
                        </button>
                        {test.status === 'active' && (
                          <button
                            onClick={() => updateTestStatus(test.id, 'paused')}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Pause
                          </button>
                        )}
                        {test.status === 'paused' && (
                          <button
                            onClick={() => updateTestStatus(test.id, 'active')}
                            className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Coming Soon</h3>
            <p className="text-gray-600">Advanced analytics features will be available here</p>
          </div>
        )}
      </main>

      {/* Momentum Report Modal */}
      {showMomentumReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full max-h-screen overflow-y-auto">
            <MomentumReport
              selectedTestId={selectedTestForMomentum}
              onClose={() => {
                setShowMomentumReport(false);
                setSelectedTestForMomentum(null);
              }}
              onSelectWinner={selectWinningTitle}
            />
          </div>
        </div>
      )}

      {/* Integrated Create Test Modal */}
      {showCreateTest && (
        <IntegratedCreateTestModal
          onClose={() => setShowCreateTest(false)}
          onTestCreated={(test) => {
            setTests(prev => [...prev, test]);
            setShowCreateTest(false);
            loadStats();
          }}
        />
      )}
    </div>
  );
}