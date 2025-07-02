import React, { useState, useEffect } from 'react';
import { Play, TestTube, TrendingUp, Target, Bell, LogOut, Video, Clock, Eye, Plus, X, Calendar, Settings, Zap, BarChart3, BarChart, Users, ArrowUpRight, ChevronRight, Activity, Sparkles, Bot, Shield, Gauge, Layers, Crown, Monitor, Youtube, GripVertical, Trash2, RefreshCw } from 'lucide-react';

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

interface Campaign {
  id: string;
  videoId: string;
  videoTitle: string;
  videoViews: number;
  videoDuration: string;
  originalTitle: string;
  currentTitle: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
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
  titles: TitleVariant[];
}

interface TitleVariant {
  id: string;
  testId: string;
  text: string;
  order: number;
  activatedAt?: string;
  isGenerated?: boolean;
  performance?: {
    views: number;
    ctr: number;
    avgViewDuration: number;
  };
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

export default function DashboardConsolidated() {
  const [authState, setAuthState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    user: null,
    error: null
  });

  const [videos, setVideos] = useState<Video[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats>({ activeTests: 0, totalViews: 0, avgCtr: '0.0', testsWon: 0 });
  const [activeTab, setActiveTab] = useState('dashboard');

  // Unified Campaign Creation State
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoTopic, setVideoTopic] = useState('');
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [rotationInterval, setRotationInterval] = useState(60); // Default 60 minutes, no 30min option
  const [winnerMetric, setWinnerMetric] = useState('ctr');
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [draggedTitle, setDraggedTitle] = useState<string | null>(null);

  // Real-time stats refresh with 24-hour API polling
  useEffect(() => {
    checkAuth();
    // Immediate load
    loadCampaigns();
    loadRealTimeStats();
    
    // Refresh data every 24 hours for real YouTube analytics
    const statsInterval = setInterval(() => {
      loadRealTimeStats();
      loadCampaigns(); // Refresh campaign data with latest analytics
    }, 24 * 60 * 60 * 1000); // 24 hours

    // More frequent UI updates for active campaigns (every 5 minutes)
    const uiInterval = setInterval(() => {
      if (campaigns.some(c => c.status === 'active')) {
        loadCampaigns(); // Update UI state for active campaigns
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(statsInterval);
      clearInterval(uiInterval);
    };
  }, [campaigns.length]);

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
        
        loadCampaigns();
        loadRealTimeStats();
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

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/tests', {
        credentials: 'include'
      });
      if (response.ok) {
        const campaignData = await response.json();
        setCampaigns(campaignData);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadRealTimeStats = async () => {
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

  const loadVideos = async () => {
    try {
      const response = await fetch('/api/videos/recent', {
        credentials: 'include'
      });
      if (response.ok) {
        const videoData = await response.json();
        setVideos(videoData);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  // Claude-powered title generation for campaign creation
  const generateTitlesForCampaign = async () => {
    if (!videoTopic.trim()) return;

    setIsGeneratingTitles(true);
    try {
      const response = await fetch('/api/generate-titles', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          videoTopic: videoTopic.trim(),
          currentTitle: selectedVideo?.title || ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedTitles(data.titles || []);
      }
    } catch (error) {
      console.error('Error generating titles:', error);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // Drag and drop functionality
  const handleDragStart = (title: string) => {
    setDraggedTitle(title);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTitle && !selectedTitles.includes(draggedTitle) && selectedTitles.length < 5) {
      setSelectedTitles(prev => [...prev, draggedTitle]);
    }
    setDraggedTitle(null);
  };

  const removeSelectedTitle = (titleToRemove: string) => {
    setSelectedTitles(prev => prev.filter(title => title !== titleToRemove));
  };

  const createTitleCampaign = async () => {
    if (!selectedVideo || selectedTitles.length < 2) return;

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
          titles: selectedTitles,
          rotationIntervalMinutes: rotationInterval,
          winnerMetric: winnerMetric
        })
      });

      if (response.ok) {
        const newCampaign = await response.json();
        setCampaigns(prev => [...prev, newCampaign]);
        setShowCreateCampaign(false);
        resetCampaignForm();
        loadRealTimeStats();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const resetCampaignForm = () => {
    setSelectedVideo(null);
    setVideoTopic('');
    setGeneratedTitles([]);
    setSelectedTitles([]);
    setRotationInterval(60);
    setWinnerMetric('ctr');
  };

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      const response = await fetch(`/api/tests/${campaignId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setCampaigns(prev => prev.map(campaign => 
          campaign.id === campaignId ? { ...campaign, status: status as Campaign['status'] } : campaign
        ));
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await fetch(`/api/tests/${campaignId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  // Authority account feature: Live title swapping
  const swapTitleVariant = async (campaignId: string, newTitleText: string) => {
    if (authState.user?.subscriptionTier !== 'authority') return;

    try {
      const response = await fetch(`/api/tests/${campaignId}/swap-title`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newTitle: newTitleText })
      });

      if (response.ok) {
        // Update local state immediately for real-time UI feedback
        setCampaigns(prev => prev.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, currentTitle: newTitleText }
            : campaign
        ));
      }
    } catch (error) {
      console.error('Error swapping title:', error);
    }
  };

  // Enhanced campaign momentum analysis with Claude
  const getCampaignMomentumAnalysis = async (campaignId: string) => {
    try {
      const response = await fetch('/api/analyze-campaign-momentum', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ campaignId })
      });

      if (response.ok) {
        const analysis = await response.json();
        return analysis;
      }
    } catch (error) {
      console.error('Error getting momentum analysis:', error);
    }
    return null;
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDuration = (duration: string) => {
    // Convert ISO 8601 duration to readable format
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return duration;
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
                  <p className="text-xs text-gray-500">
                    {authState.user?.subscriptionTier === 'authority' ? 'Authority' : 'Pro'} Account
                  </p>
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
            {/* Real-time Stats Cards */}
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

            {/* Create Title Campaign - Single Unified Tool */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create Title Campaign</h2>
                <button
                  onClick={() => {
                    setShowCreateCampaign(true);
                    loadVideos();
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Campaign</span>
                </button>
              </div>

              {!showCreateCampaign && campaigns.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                  <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                  <p className="text-gray-500 mb-6">Create your first title campaign to start optimizing</p>
                  <button
                    onClick={() => {
                      setShowCreateCampaign(true);
                      loadVideos();
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create Campaign</span>
                  </button>
                </div>
              )}
            </div>

            {/* Campaign Creation Interface */}
            {showCreateCampaign && (
              <div className="mb-8 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Create Title Campaign</h3>
                      <p className="text-blue-100">Generate titles, select variants, and launch your test</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowCreateCampaign(false);
                        resetCampaignForm();
                      }}
                      className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Step 1: Select Video */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">1. Select Your Video</h4>
                    <div className="grid gap-4 max-h-60 overflow-y-auto">
                      {videos.map((video) => (
                        <div
                          key={video.id}
                          onClick={() => {
                            setSelectedVideo(video);
                            setVideoTopic(video.title);
                          }}
                          className={`flex items-center space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedVideo?.id === video.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-20 h-14 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 line-clamp-2">{video.title}</h5>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center space-x-1">
                                <Eye className="w-4 h-4" />
                                <span>{formatViewCount(video.viewCount)} views</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatDuration(video.duration)}</span>
                              </span>
                            </div>
                          </div>
                          {selectedVideo?.id === video.id && (
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Generate Titles with Claude */}
                  {selectedVideo && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">2. Generate Title Variations</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Video Topic (Optional - will use current title if empty)
                          </label>
                          <input
                            type="text"
                            value={videoTopic}
                            onChange={(e) => setVideoTopic(e.target.value)}
                            placeholder="Describe your video content for better title suggestions..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <button
                          onClick={generateTitlesForCampaign}
                          disabled={isGeneratingTitles}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center space-x-2 disabled:cursor-not-allowed"
                        >
                          {isGeneratingTitles ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Generating with Claude...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Generate Titles</span>
                            </>
                          )}
                        </button>

                        {/* Generated Titles - Draggable */}
                        {generatedTitles.length > 0 && (
                          <div className="mt-6">
                            <h5 className="font-medium text-gray-900 mb-3">
                              Generated Titles (Drag to add to campaign):
                            </h5>
                            <div className="space-y-2">
                              {generatedTitles.map((title, index) => (
                                <div
                                  key={index}
                                  draggable
                                  onDragStart={() => handleDragStart(title)}
                                  className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200 cursor-move hover:bg-purple-100 transition-colors"
                                >
                                  <div className="flex items-center space-x-3">
                                    <GripVertical className="w-4 h-4 text-purple-600" />
                                    <span className="text-gray-900 flex-1">{title}</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (!selectedTitles.includes(title) && selectedTitles.length < 5) {
                                        setSelectedTitles(prev => [...prev, title]);
                                      }
                                    }}
                                    disabled={selectedTitles.includes(title) || selectedTitles.length >= 5}
                                    className="text-purple-600 hover:text-purple-700 disabled:text-gray-400 px-2 py-1 text-sm disabled:cursor-not-allowed"
                                  >
                                    {selectedTitles.includes(title) ? 'Added' : 'Add'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Campaign Title Variants */}
                  {selectedVideo && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">3. Campaign Title Variants</h4>
                      <div
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className="min-h-32 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"
                      >
                        {selectedTitles.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Drag titles here or add them manually</p>
                            <p className="text-sm mt-1">Need 2-5 titles for campaign</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700 mb-3">
                              Selected Titles ({selectedTitles.length}/5):
                            </p>
                            {selectedTitles.map((title, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                                    {index + 1}
                                  </div>
                                  <span className="text-gray-900">{title}</span>
                                </div>
                                <button
                                  onClick={() => removeSelectedTitle(title)}
                                  className="text-red-600 hover:text-red-700 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Campaign Settings */}
                  {selectedTitles.length >= 2 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">4. Campaign Settings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Title Rotation Interval
                          </label>
                          <select
                            value={rotationInterval}
                            onChange={(e) => setRotationInterval(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value={60}>1 hour</option>
                            <option value={120}>2 hours</option>
                            <option value={240}>4 hours</option>
                            <option value={480}>8 hours</option>
                            <option value={720}>12 hours</option>
                            <option value={1440}>24 hours</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Winner Determination
                          </label>
                          <select
                            value={winnerMetric}
                            onChange={(e) => setWinnerMetric(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="ctr">Highest CTR</option>
                            <option value="views">Most Views</option>
                            <option value="combined">Combined (CTR + Views)</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end space-x-4">
                        <button
                          onClick={() => {
                            setShowCreateCampaign(false);
                            resetCampaignForm();
                          }}
                          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={createTitleCampaign}
                          className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center space-x-2"
                        >
                          <Play className="w-4 h-4" />
                          <span>Launch Campaign</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Campaigns */}
            {campaigns.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Title Campaigns</h2>
                <div className="grid gap-6">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
                      {/* Campaign Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{campaign.videoTitle}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                              campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                              campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {campaign.status}
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{campaign.rotationIntervalMinutes} min rotation</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Target className="w-4 h-4" />
                              <span>{campaign.titles.length} titles</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => deleteCampaign(campaign.id)}
                            className="text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Campaign"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* YouTube Video Data Display */}
                      <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <div className="flex items-center space-x-2 mb-3">
                          <Youtube className="w-5 h-5 text-red-600" />
                          <h4 className="font-medium text-gray-900">Video Data</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Total Views</p>
                            <p className="font-semibold text-gray-900">{formatViewCount(campaign.videoViews || 0)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Duration</p>
                            <p className="font-semibold text-gray-900">{formatDuration(campaign.videoDuration || 'PT0S')}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Original Title</p>
                            <p className="font-semibold text-gray-900 truncate">{campaign.originalTitle || campaign.videoTitle}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Current Title</p>
                            <p className="font-semibold text-blue-600 truncate">{campaign.currentTitle || 'Rotating...'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Performance Summary */}
                      {campaign.analytics && (
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {(campaign.analytics.averageCtr * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-600">Average CTR</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {Math.round(campaign.analytics.averageViewDuration)}s
                            </div>
                            <div className="text-xs text-gray-600">Avg View Duration</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">
                              {campaign.analytics.totalViews.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-600">Total Views</div>
                          </div>
                        </div>
                      )}

                      {/* Title Variants with Live Swapping (Authority Feature) */}
                      {authState.user?.subscriptionTier === 'authority' && campaign.status === 'active' && (
                        <div className="mb-6 bg-purple-50 rounded-xl p-4 border border-purple-200">
                          <div className="flex items-center space-x-2 mb-3">
                            <Crown className="w-5 h-5 text-purple-600" />
                            <h4 className="font-medium text-purple-900">Authority Controls - Live Title Management</h4>
                          </div>
                          <div className="grid gap-2">
                            {campaign.titles.map((title, index) => (
                              <div
                                key={title.id}
                                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                  campaign.currentTitle === title.text
                                    ? 'border-purple-500 bg-purple-100'
                                    : 'border-purple-200 bg-white hover:border-purple-300'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                    campaign.currentTitle === title.text
                                      ? 'bg-purple-500 text-white'
                                      : 'bg-purple-200 text-purple-700'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <span className="text-gray-900 flex-1">{title.text}</span>
                                  {campaign.currentTitle === title.text && (
                                    <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full">
                                      LIVE
                                    </span>
                                  )}
                                </div>
                                {campaign.currentTitle !== title.text && (
                                  <button
                                    onClick={() => swapTitleVariant(campaign.id, title.text)}
                                    className="text-purple-600 hover:text-purple-700 font-medium text-sm px-3 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                                  >
                                    Switch Live
                                  </button>
                                )}
                                {title.performance && (
                                  <div className="text-xs text-gray-600 text-right">
                                    <div>{title.performance.views} views</div>
                                    <div>{(title.performance.ctr * 100).toFixed(1)}% CTR</div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Campaign Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {campaign.status === 'active' && (
                            <button
                              onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                              className="px-4 py-2 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors flex items-center space-x-2"
                            >
                              <X className="w-4 h-4" />
                              <span>Pause</span>
                            </button>
                          )}
                          {campaign.status === 'paused' && (
                            <button
                              onClick={() => updateCampaignStatus(campaign.id, 'active')}
                              className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors flex items-center space-x-2"
                            >
                              <Play className="w-4 h-4" />
                              <span>Resume</span>
                            </button>
                          )}
                          
                          {/* Claude Momentum Analysis Button */}
                          <button
                            onClick={async () => {
                              const analysis = await getCampaignMomentumAnalysis(campaign.id);
                              if (analysis) {
                                alert(`Claude Analysis: ${analysis.insights || 'Analysis complete'}`);
                              }
                            }}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center space-x-2"
                          >
                            <Bot className="w-4 h-4" />
                            <span>Claude Analysis</span>
                          </button>
                        </div>

                        <div className="text-sm text-gray-500">
                          {authState.user?.subscriptionTier === 'authority' ? (
                            <span className="text-purple-600 font-medium flex items-center space-x-1">
                              <Crown className="w-4 h-4" />
                              <span>Authority Account</span>
                            </span>
                          ) : (
                            <span className="text-blue-600 font-medium">Pro Account</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600">Detailed analytics and insights for your campaigns</p>
          </div>
        )}
      </main>
    </div>
  );
}