import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Play, 
  TestTube, 
  TrendingUp, 
  Target, 
  LogOut, 
  Video, 
  Clock, 
  Eye, 
  Plus, 
  X, 
  Calendar, 
  BarChart3, 
  Users, 
  ArrowUpRight, 
  Activity, 
  Shield, 
  Gauge, 
  Crown, 
  Monitor,
  PlayCircle,
  ChevronRight,
  Pause,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import FuturisticVideoSelector from '@/components/FuturisticVideoSelector';

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
  avgCtr: number;
  avgViewDuration: number;
  totalTitlesTested: number;
  completedTests: number;
}

interface Momentum {
  currentStreak: number;
  totalOptimizations: number;
  avgImprovementRate: number;
  weeklyProgress: number;
}

// Safe number formatting utility
const safeToFixed = (value: any, decimals: number = 1): string => {
  const num = Number(value);
  return isNaN(num) ? "0" : num.toFixed(decimals);
};

export default function DashboardImproved() {
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [testConfig, setTestConfig] = useState({
    rotationIntervalMinutes: 60,
    winnerMetric: 'ctr',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });
  const [titleInputs, setTitleInputs] = useState(['', '', '', '', '']);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { toast } = useToast();

  // Get user from the existing auth system
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: () => fetch('/api/auth/me', { credentials: 'include' }).then(res => res.json()),
  });

  // Data queries
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!user
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['/api/tests'],
    queryFn: async () => {
      const response = await fetch('/api/tests', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch tests');
      return response.json();
    },
    enabled: !!user
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['/api/videos/recent'],
    queryFn: async () => {
      const response = await fetch('/api/videos/recent', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch videos');
      return response.json();
    },
    enabled: !!user
  });

  // Calculate accurate momentum data
  const momentum: Momentum = React.useMemo(() => {
    if (!tests || !stats) return { currentStreak: 0, totalOptimizations: 0, avgImprovementRate: 0, weeklyProgress: 0 };

    const completedTests = tests.filter((t: Test) => t.status === 'completed');
    const recentTests = tests.filter((t: Test) => {
      const createdAt = new Date(t.createdAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return createdAt >= weekAgo;
    });

    // Calculate current streak (consecutive days with active testing)
    const sortedTests = tests.sort((a: Test, b: Test) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    let streak = 0;
    let currentDate = new Date();
    for (const test of sortedTests) {
      const testDate = new Date(test.createdAt);
      const daysDiff = Math.floor((currentDate.getTime() - testDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= streak + 1) {
        streak = daysDiff + 1;
        currentDate = testDate;
      } else {
        break;
      }
    }

    // Calculate improvement rate from completed tests
    const improvementRates = completedTests
      .filter((t: Test) => t.analytics?.averageCtr)
      .map((t: Test) => t.analytics!.averageCtr);
    const avgImprovement = improvementRates.length > 0 
      ? improvementRates.reduce((a: number, b: number) => a + b, 0) / improvementRates.length 
      : 0;

    return {
      currentStreak: Math.min(streak, 30), // Cap at 30 days for display
      totalOptimizations: stats.totalTitlesTested || 0,
      avgImprovementRate: avgImprovement,
      weeklyProgress: (recentTests.length / Math.max(tests.length, 1)) * 100
    };
  }, [tests, stats]);

  const handleCreateTest = async () => {
    if (!selectedVideo || titleInputs.filter(t => t.trim()).length < 2) {
      toast({
        title: 'Error',
        description: 'Please select a video and enter at least 2 titles',
        variant: 'destructive'
      });
      return;
    }

    setIsCreatingTest(true);
    try {
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          videoId: selectedVideo.id,
          videoTitle: selectedVideo.title,
          titles: titleInputs.filter(t => t.trim()),
          ...testConfig
        })
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        toast({
          title: 'Success',
          description: 'A/B test created successfully!',
        });
        setShowCreateTest(false);
        setSelectedVideo(null);
        setTitleInputs(['', '', '', '', '']);
      } else {
        throw new Error('Failed to create test');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create test',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingTest(false);
    }
  };

  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
  };

  // Test management mutations
  const pauseTest = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetch(`/api/tests/${testId}/pause`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to pause test');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({ title: 'Test paused successfully' });
    }
  });

  const resumeTest = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetch(`/api/tests/${testId}/resume`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to resume test');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({ title: 'Test resumed successfully' });
    }
  });

  const deleteTest = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete test');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({ title: 'Test deleted successfully' });
    }
  });

  const formatNumber = (num: number) => {
    const safeNum = Number(num) || 0;
    if (safeNum >= 1000000) return `${safeToFixed(safeNum / 1000000)}M`;
    if (safeNum >= 1000) return `${safeToFixed(safeNum / 1000, 0)}K`;
    return safeNum.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredTests = tests.filter((test: Test) => {
    const matchesSearch = test.videoTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || test.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading TitleTesterPro</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TitleTesterPro</h1>
                <p className="text-xs text-gray-500 -mt-1">A/B Testing Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {user.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-sm text-gray-700 hidden sm:block">{user.name}</span>
                {user.subscriptionTier === 'authority' && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    Authority
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Simplified Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Active Tests */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <TestTube className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Active Tests</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeTests || 0}</p>
            </div>
          </div>

          {/* Total Views */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats?.totalViews || 0)}</p>
            </div>
          </div>

          {/* Average CTR */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Avg CTR</p>
              <p className="text-2xl font-bold text-gray-900">{safeToFixed(stats?.avgCtr)}%</p>
            </div>
          </div>
        </div>

        {/* Active Tests Section - Full Width */}
        <div className="mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Active Tests</h2>
                    <p className="text-sm text-gray-500">Manage your running A/B tests</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search tests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-48"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredTests.length > 0 ? (
                filteredTests.map((test: Test) => (
                  <div key={test.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{test.videoTitle}</h3>
                          <Badge className={getStatusColor(test.status)}>{test.status}</Badge>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Every {test.rotationIntervalMinutes}min</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Target className="w-4 h-4" />
                            <span>{test.winnerMetric === 'ctr' ? 'CTR' : test.winnerMetric === 'views' ? 'Views' : 'Combined'}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(test.startDate).toLocaleDateString()}</span>
                          </span>
                        </div>
                        {test.analytics && (
                          <div className="flex items-center space-x-4 mt-2 text-sm">
                            <span className="text-green-600 font-medium">
                              {safeToFixed(test.analytics.averageCtr)}% CTR
                            </span>
                            <span className="text-blue-600 font-medium">
                              {formatNumber(test.analytics.totalViews)} views
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {test.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => pauseTest.mutate(test.id)}
                            disabled={pauseTest.isPending}
                          >
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </Button>
                        ) : test.status === 'paused' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resumeTest.mutate(test.id)}
                            disabled={resumeTest.isPending}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Resume
                          </Button>
                        ) : null}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteTest.mutate(test.id)}
                          disabled={deleteTest.isPending}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TestTube className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tests found</h3>
                  <p className="text-gray-500 mb-4">Create your first A/B test to start optimizing your titles</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Library Section - Full Width */}
        <div className="mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Your Video Library</h2>
                    <p className="text-sm text-gray-500">Select a video to create a new A/B test</p>
                  </div>
                </div>
                <Button onClick={() => setShowCreateTest(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Test
                </Button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {videos.map((video: any) => (
                  <div
                    key={video.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedVideo(video);
                      setShowCreateTest(true);
                    }}
                  >
                    <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {video.thumbnail ? (
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const nextSibling = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextSibling) {
                              nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <PlayCircle className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">{video.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatNumber(video.viewCount)} views</span>
                      <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tests List (2/3 width) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="border-b border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900">Recent Tests</h3>
                <p className="text-gray-600 mt-1">Your latest A/B testing activity</p>
              </div>
              
              <div className="divide-y divide-gray-100">
                {filteredTests.length > 0 ? (
                  filteredTests.slice(0, 5).map((test: Test) => (
                    <div key={test.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-gray-900 line-clamp-1">{test.videoTitle}</h4>
                            <Badge className={getStatusColor(test.status)}>
                              {getStatusIcon(test.status)}
                              <span className="ml-1 capitalize">{test.status}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{test.titles.length} variants</span>
                            <span>{test.rotationIntervalMinutes}min intervals</span>
                            <span>Created {new Date(test.createdAt).toLocaleDateString()}</span>
                          </div>
                          {test.analytics && (
                            <div className="flex items-center space-x-4 mt-2 text-sm">
                              <span className="text-green-600 font-medium">
                                {safeToFixed(test.analytics.averageCtr)}% CTR
                              </span>
                              <span className="text-blue-600 font-medium">
                                {formatNumber(test.analytics.totalViews)} views
                              </span>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tests found</h3>
                    <p className="text-gray-600">Select a video and create your first A/B test</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Momentum Dashboard (1/3 width) */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="border-b border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900">Testing Momentum</h3>
                <p className="text-gray-600 mt-1">Your optimization progress</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Current Streak */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-white">{momentum.currentStreak}</span>
                  </div>
                  <p className="font-medium text-gray-900">Day Testing Streak</p>
                  <p className="text-sm text-gray-600">Keep the momentum going!</p>
                </div>

                {/* Stats */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Total Optimizations</span>
                    <span className="font-bold text-gray-900">{momentum.totalOptimizations}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Avg Improvement</span>
                    <span className="font-bold text-green-600">+{safeToFixed(momentum.avgImprovementRate)}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Weekly Progress</span>
                    <span className="font-bold text-blue-600">{safeToFixed(momentum.weeklyProgress, 0)}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">This Week</span>
                    <span className="text-sm text-gray-500">{safeToFixed(Math.min(momentum.weeklyProgress, 100), 0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(momentum.weeklyProgress, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="border-b border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              </div>
              
              <div className="p-6 space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="ghost"
                  onClick={() => setShowCreateTest(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Test
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="ghost"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="ghost"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Browse Videos
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Test Modal */}
      {showCreateTest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Create New A/B Test</h3>
                  <p className="text-blue-100 mt-1">Set up title variants and testing parameters</p>
                </div>
                <button
                  onClick={() => setShowCreateTest(false)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Selected Video Display */}
              {selectedVideo && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-12 bg-gray-200 rounded overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                        <PlayCircle className="w-6 h-6 text-white opacity-70" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">{selectedVideo?.title}</h4>
                      <p className="text-sm text-blue-700">{formatNumber(selectedVideo?.viewCount || 0)} views</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Title Variants */}
              <div className="space-y-4 mb-6">
                <h4 className="font-medium text-gray-900">Title Variants (2-5 required)</h4>
                {titleInputs.map((title, index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Variant {index + 1} {index < 2 && <span className="text-red-500">*</span>}
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => {
                        const newTitles = [...titleInputs];
                        newTitles[index] = e.target.value;
                        setTitleInputs(newTitles);
                      }}
                      placeholder={`Enter title variant ${index + 1}...`}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>

              {/* Test Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Rotation Interval</label>
                  <Select 
                    value={testConfig.rotationIntervalMinutes.toString()} 
                    onValueChange={(value) => setTestConfig(prev => ({ ...prev, rotationIntervalMinutes: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                      <SelectItem value="1440">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Winner Metric</label>
                  <Select 
                    value={testConfig.winnerMetric} 
                    onValueChange={(value) => setTestConfig(prev => ({ ...prev, winnerMetric: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ctr">Highest CTR</SelectItem>
                      <SelectItem value="views">Most Views</SelectItem>
                      <SelectItem value="combined">Combined Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Start Date</label>
                  <Input
                    type="datetime-local"
                    value={testConfig.startDate}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">End Date</label>
                  <Input
                    type="datetime-local"
                    value={testConfig.endDate}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateTest(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTest}
                  disabled={!selectedVideo || titleInputs.filter(t => t.trim()).length < 2 || isCreatingTest}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isCreatingTest ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 mr-2" />
                      Create Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
