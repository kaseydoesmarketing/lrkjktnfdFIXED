import React, { useState } from 'react';
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
  ArrowUpRight, 
  PlayCircle,
  Pause,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Sparkles,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
  BarChart3,
  MousePointer,
  PlaySquare,
  Timer,
  History,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  thumbnail: string;
  duration: string;
  publishedAt: string;
  viewCount: number;
}

interface TestTitle {
  id: string;
  title: string;
  order: number;
  isActive: boolean;
  analytics?: {
    impressions: number;
    clicks: number;
    ctr: number;
    avgViewDuration: number;
    views: number;
  };
}

interface TestAnalytics {
  totalViews: number;
  totalImpressions: number;
  averageCtr: number;
  averageViewDuration: number;
  rotationsCount: number;
  currentTitleIndex: number;
  lastRotation: string;
  changeLog: {
    timestamp: string;
    titleUsed: string;
    duration: string;
    views: number;
    ctr: number;
  }[];
}

interface Test {
  id: string;
  userId: string;
  videoId: string;
  videoTitle: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  rotationIntervalMinutes: number;
  winnerMetric: 'ctr' | 'views' | 'combined';
  startDate: string;
  endDate?: string;
  createdAt: string;
  titles?: TestTitle[];
  analytics?: TestAnalytics;
  currentTitle?: string;
}

interface Stats {
  activeTests: number;
  totalViews: number;
  avgCtr: number;
  avgViewDuration: number;
  totalTitlesTested: number;
  completedTests: number;
}

// Safe number formatting utility
const safeToFixed = (value: any, decimals: number = 1): string => {
  const num = Number(value);
  return isNaN(num) ? "0" : num.toFixed(decimals);
};

const formatNumber = (num: number) => {
  const safeNum = Number(num) || 0;
  if (safeNum >= 1000000) return `${safeToFixed(safeNum / 1000000)}M`;
  if (safeNum >= 1000) return `${safeToFixed(safeNum / 1000, 0)}K`;
  return safeNum.toString();
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const ActiveTestCard: React.FC<{ test: Test }> = ({ test }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const analytics = test.analytics || {
    totalViews: 0,
    totalImpressions: 0,
    averageCtr: 0,
    averageViewDuration: 0,
    rotationsCount: 0,
    currentTitleIndex: 0,
    lastRotation: test.createdAt,
    changeLog: []
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
        <CollapsibleTrigger className="w-full p-6 text-left hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{test.videoTitle}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <Badge className={getStatusColor(test.status)}>
                    {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {analytics.rotationsCount} rotations
                  </span>
                  <span className="text-sm text-gray-500">
                    Last: {formatTimeAgo(analytics.lastRotation)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {safeToFixed(analytics.averageCtr, 1)}%
                </div>
                <div className="text-sm text-gray-500">Avg CTR</div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-gray-100 p-6 bg-gray-50">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total Views</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {formatNumber(analytics.totalViews)}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <MousePointer className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Avg CTR</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {safeToFixed(analytics.averageCtr, 1)}%
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Avg Duration</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {Math.floor(analytics.averageViewDuration / 60)}:{String(Math.floor(analytics.averageViewDuration % 60)).padStart(2, '0')}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <PlaySquare className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-600">Current Title</span>
                </div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {test.currentTitle || 'No active title'}
                </div>
              </div>
            </div>

            {/* Change Log */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-4">
                <History className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Complete Change Log</h4>
              </div>

              {analytics.changeLog.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {analytics.changeLog.map((change, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {change.titleUsed}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatTimeAgo(change.timestamp)} • Active for {change.duration}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatNumber(change.views)} views
                        </div>
                        <div className="text-xs text-gray-500">
                          {safeToFixed(change.ctr, 1)}% CTR
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Timer className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No title rotations yet</p>
                  <p className="text-sm">Changes will appear here as titles rotate</p>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default function DashboardEnhanced() {
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [testConfig, setTestConfig] = useState({
    rotationIntervalMinutes: 60,
    winnerMetric: 'ctr',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });
  const [titleInputs, setTitleInputs] = useState(['', '', '', '', '']);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { toast } = useToast();

  // Fetch data with proper error handling
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
    retry: false,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const { data: tests = [], isLoading: testsLoading } = useQuery<Test[]>({
    queryKey: ['/api/tests'],
    enabled: !!user,
    retry: false,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ['/api/videos/recent'],
    enabled: !!user && showCreateTest,
    retry: false,
  });

  const createTest = useMutation({
    mutationFn: async (testData: any) => {
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create test');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setShowCreateTest(false);
      setSelectedVideo(null);
      setTitleInputs(['', '', '', '', '']);
      toast({ title: 'Test created successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create test', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('sessionToken');
    window.location.href = '/api/auth/logout';
  };

  const handleCreateTest = async () => {
    if (!selectedVideo) {
      toast({ title: 'Please select a video', variant: 'destructive' });
      return;
    }

    const validTitles = titleInputs.filter(title => title.trim().length > 0);
    if (validTitles.length < 2) {
      toast({ title: 'Please enter at least 2 title variants', variant: 'destructive' });
      return;
    }

    const testData = {
      videoId: selectedVideo.id,
      videoTitle: selectedVideo.title,
      titles: validTitles,
      rotationIntervalMinutes: testConfig.rotationIntervalMinutes,
      winnerMetric: testConfig.winnerMetric,
      startDate: new Date(testConfig.startDate).toISOString(),
      endDate: new Date(testConfig.endDate).toISOString()
    };

    createTest.mutate(testData);
  };

  // Filter tests
  const activeTests = tests.filter((test: Test) => test.status === 'active');
  const filteredTests = tests.filter((test: Test) => {
    const matchesSearch = test.videoTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || test.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading TitleTesterPro</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TitleTesterPro</h1>
                <p className="text-xs text-gray-500 -mt-1">Creator Analytics Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-sm text-gray-700 hidden sm:block">{user?.name}</span>
                {user?.subscriptionTier === 'authority' && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    Authority
                  </Badge>
                )}
              </div>

              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm card-hover">
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

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm card-hover">
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

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm card-hover">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Average CTR</p>
              <p className="text-2xl font-bold text-gray-900">{safeToFixed(stats?.avgCtr || 0, 1)}%</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm card-hover">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Completed Tests</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.completedTests || 0}</p>
            </div>
          </div>
        </div>

        {/* Active Tests Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Active Tests</h2>
              <p className="text-gray-600 mt-1">Real-time A/B testing analytics</p>
            </div>
            <Button
              onClick={() => setShowCreateTest(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Button>
          </div>

          {activeTests.length > 0 ? (
            <div className="space-y-4">
              {activeTests.map((test: Test) => (
                <ActiveTestCard key={test.id} test={test} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TestTube className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Tests</h3>
              <p className="text-gray-600 mb-4">Create your first A/B test to start optimizing your video titles</p>
              <Button
                onClick={() => setShowCreateTest(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Test
              </Button>
            </div>
          )}
        </div>

        {/* Video Library Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">All Tests</h2>
              <p className="text-gray-600 mt-1">Complete testing history and management</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search tests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredTests.length > 0 ? (
            <div className="space-y-3">
              {filteredTests.map((test: Test) => (
                <div key={test.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Video className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{test.videoTitle}</h3>
                      <div className="flex items-center space-x-3 mt-1">
                        <Badge className={getStatusColor(test.status)}>
                          {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Created {formatTimeAgo(test.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {test.analytics ? `${safeToFixed(test.analytics.averageCtr, 1)}% CTR` : 'No data'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {test.analytics ? formatNumber(test.analytics.totalViews) + ' views' : 'No views'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TestTube className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tests Found</h3>
              <p className="text-gray-600">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first test to get started'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Test Modal */}
      <Dialog open={showCreateTest} onOpenChange={setShowCreateTest}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New A/B Test</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Video Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Select Video</Label>
              <FuturisticVideoSelector
                onSelectVideo={setSelectedVideo}
                selectedVideoId={selectedVideo?.id}
              />
            </div>

            {/* Title Variants */}
            {selectedVideo && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Title Variants (2-5 required)
                </Label>
                <div className="space-y-3">
                  {titleInputs.map((title, index) => (
                    <div key={index} className="relative">
                      <Input
                        placeholder={`Title variant ${index + 1}${index < 2 ? ' (required)' : ' (optional)'}`}
                        value={title}
                        onChange={(e) => {
                          const newTitles = [...titleInputs];
                          newTitles[index] = e.target.value;
                          setTitleInputs(newTitles);
                        }}
                        className="pr-10"
                      />
                      <div className="absolute right-3 top-3 text-xs text-gray-400">
                        {title.length}/100
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Configuration */}
            {selectedVideo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Rotation Interval
                  </Label>
                  <Select
                    value={testConfig.rotationIntervalMinutes.toString()}
                    onValueChange={(value) => 
                      setTestConfig({...testConfig, rotationIntervalMinutes: parseInt(value)})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                      <SelectItem value="720">12 hours</SelectItem>
                      <SelectItem value="1440">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Winner Determination
                  </Label>
                  <Select
                    value={testConfig.winnerMetric}
                    onValueChange={(value) => 
                      setTestConfig({...testConfig, winnerMetric: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ctr">Highest CTR</SelectItem>
                      <SelectItem value="views">Highest Views</SelectItem>
                      <SelectItem value="combined">Combined Metrics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Start Date
                  </Label>
                  <Input
                    type="datetime-local"
                    value={testConfig.startDate}
                    onChange={(e) => 
                      setTestConfig({...testConfig, startDate: e.target.value})
                    }
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    End Date
                  </Label>
                  <Input
                    type="datetime-local"
                    value={testConfig.endDate}
                    onChange={(e) => 
                      setTestConfig({...testConfig, endDate: e.target.value})
                    }
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCreateTest(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTest}
                disabled={!selectedVideo || titleInputs.filter(t => t.trim()).length < 2 || createTest.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
              >
                {createTest.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
        </DialogContent>
      </Dialog>
    </div>
  );
}