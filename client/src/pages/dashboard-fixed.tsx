import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Play, TestTube, TrendingUp, Target, LogOut, Eye, Plus, Clock, 
  ArrowUpRight, Pause, CheckCircle, ChevronDown, ChevronUp,
  BarChart3, MousePointer, PlaySquare, Trash2, Video, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar 
} from 'recharts';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
}

interface Stats {
  activeTests: number;
  totalViews: number;
  avgCtr: number;
  completedTests: number;
}

interface Test {
  id: string;
  userId: string;
  videoId: string;
  videoTitle: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
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

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  duration: string;
}

interface Analytics {
  rotationsCount: number;
  nextRotationIn: number;
  averageCtr: number;
  totalViews: number;
  averageViewDuration: number;
  currentTitle: string;
  rotationLogs: Array<{
    title: string;
    activatedAt: string;
    order: number;
  }>;
}

// Helper functions
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const safeToFixed = (num: number | undefined, decimals: number): string => {
  return (num || 0).toFixed(decimals);
};

// Active Test Card Component
const ActiveTestCard = ({ 
  test, 
  onTestAction, 
  user 
}: { 
  test: Test; 
  onTestAction: (id: string, action: string) => void; 
  user?: User 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: [`/api/tests/${test.id}/analytics`],
    refetchInterval: 30 * 1000,
  });

  const rotationsCount = analytics?.rotationsCount || 0;
  const nextRotationIn = analytics?.nextRotationIn || 0;
  const averageCtr = analytics?.averageCtr || 0;
  const totalViews = analytics?.totalViews || 0;
  const averageViewDuration = analytics?.averageViewDuration || 0;
  const currentTitle = analytics?.currentTitle || 'Loading...';
  const rotationLogs = analytics?.rotationLogs || [];

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <CollapsibleTrigger className="w-full p-6 text-left hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <Badge className={`${
                  test.status === 'active' ? 'bg-green-100 text-green-800' :
                  test.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                </Badge>
                <span className="text-xs text-gray-500">
                  {test.titles.length} variants • {test.rotationIntervalMinutes}min intervals
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{test.videoTitle}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{rotationsCount} rotations</span>
                <span>Next: {nextRotationIn}m</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {safeToFixed(averageCtr, 1)}%
                </div>
                <div className="text-sm text-gray-500">Avg CTR</div>
              </div>
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-gray-100 p-6 bg-gray-50">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total Views</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{formatNumber(totalViews)}</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <MousePointer className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Avg CTR</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{safeToFixed(averageCtr, 1)}%</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Avg Duration</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {Math.floor(averageViewDuration / 60)}:{String(Math.floor(averageViewDuration % 60)).padStart(2, '0')}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <PlaySquare className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-600">Current Title</span>
                </div>
                <div className="text-sm font-medium text-gray-900 truncate">{currentTitle}</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* CTR Performance Trend */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                  CTR Performance Trend
                </h4>
                <div className="h-64">
                  {rotationLogs.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={rotationLogs.map((log, index) => ({
                        name: `Title ${log.order}`,
                        ctr: averageCtr,
                        views: totalViews / rotationLogs.length
                      }))}>
                        <defs>
                          <linearGradient id="ctrGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `${value}%`} />
                        <Tooltip />
                        <Area type="monotone" dataKey="ctr" stroke="#3B82F6" fill="url(#ctrGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No data available yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title Performance Comparison */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
                  Title Performance Comparison
                </h4>
                <div className="h-64">
                  {test.titles.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={test.titles.map(title => ({
                        name: `T${title.order}`,
                        views: totalViews / test.titles.length
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="views" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No comparison data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Title Rotation History */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <RotateCcw className="w-5 h-5 text-gray-600 mr-2" />
                  Title Rotation History
                </h4>
                <Badge>{rotationLogs.length} rotations</Badge>
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {rotationLogs.length > 0 ? (
                  rotationLogs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge className="bg-blue-600 text-white">#{log.order}</Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(log.activatedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="font-medium text-gray-900 text-sm">"{log.title}"</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatNumber(totalViews)} views</div>
                        <div className="text-xs text-gray-500">{safeToFixed(averageCtr, 1)}% CTR</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No rotations yet</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                {test.status === 'active' && (
                  <Button onClick={() => onTestAction(test.id, 'pause')} variant="outline" size="sm">
                    <Pause className="w-4 h-4 mr-1" /> Pause
                  </Button>
                )}
                {test.status === 'paused' && (
                  <Button onClick={() => onTestAction(test.id, 'resume')} variant="outline" size="sm">
                    <Play className="w-4 h-4 mr-1" /> Resume
                  </Button>
                )}
                <Button onClick={() => onTestAction(test.id, 'complete')} variant="outline" size="sm">
                  <CheckCircle className="w-4 h-4 mr-1" /> Complete
                </Button>
              </div>
              
              <Button 
                onClick={() => onTestAction(test.id, 'cancel')}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Cancel Test
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// Main Dashboard Component
export default function DashboardFixed() {
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [testConfig, setTestConfig] = useState({
    rotationIntervalMinutes: 60,
    winnerMetric: 'ctr',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });
  const [titleInputs, setTitleInputs] = useState(['', '', '', '', '']);
  const { toast } = useToast();

  // Queries
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const { data: stats = { activeTests: 0, totalViews: 0, avgCtr: 0, completedTests: 0 } } = useQuery<Stats>({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
    refetchInterval: 30 * 1000,
  });

  const { data: tests = [] } = useQuery<Test[]>({
    queryKey: ['/api/tests'],
    enabled: !!user,
    refetchInterval: 30 * 1000,
  });

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ['/api/videos/recent'],
    enabled: !!user && showCreateTest,
  });

  // Mutations
  const testActionMutation = useMutation({
    mutationFn: async ({ testId, action }: { testId: string; action: string }) => {
      const response = await fetch(`/api/tests/${testId}/${action}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to perform action');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      const messages: Record<string, string> = {
        pause: 'Test paused',
        resume: 'Test resumed', 
        complete: 'Test completed',
        cancel: 'Test cancelled'
      };
      
      toast({ title: messages[variables.action] || 'Action completed' });
    }
  });

  const createTestMutation = useMutation({
    mutationFn: async (testData: any) => {
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to create test');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setShowCreateTest(false);
      setSelectedVideo(null);
      setTitleInputs(['', '', '', '', '']);
      toast({ title: 'Test created successfully' });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Logout failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/';
    }
  });

  // Handlers
  const handleTestAction = (testId: string, action: string) => {
    testActionMutation.mutate({ testId, action });
  };

  const handleCreateTest = () => {
    if (!selectedVideo) {
      toast({ title: 'Please select a video', variant: 'destructive' });
      return;
    }

    const validTitles = titleInputs.filter(title => title.trim().length > 0);
    if (validTitles.length < 2) {
      toast({ title: 'Please enter at least 2 title variants', variant: 'destructive' });
      return;
    }

    createTestMutation.mutate({
      videoId: selectedVideo.id,
      videoTitle: selectedVideo.title,
      titles: validTitles,
      rotationIntervalMinutes: testConfig.rotationIntervalMinutes,
      winnerMetric: testConfig.winnerMetric,
      startDate: new Date(testConfig.startDate).toISOString(),
      endDate: new Date(testConfig.endDate).toISOString()
    });
  };

  // Filter tests
  const activeTests = tests.filter(test => test.status === 'active');

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Please log in to access your dashboard</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TitleTesterPro</h1>
                <p className="text-xs text-gray-500 -mt-1">Real-time A/B Testing</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user.name}</span>
              <Button
                onClick={() => logoutMutation.mutate()}
                variant="outline"
                size="sm"
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Active Tests</span>
              <TestTube className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.activeTests}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Views</span>
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalViews)}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Avg CTR</span>
              <MousePointer className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{safeToFixed(stats.avgCtr, 1)}%</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completed</span>
              <CheckCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.completedTests}</div>
          </div>
        </div>

        {/* Active Tests */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Active Tests</h2>
            <Button onClick={() => setShowCreateTest(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Button>
          </div>

          <div className="space-y-4">
            {activeTests.length > 0 ? (
              activeTests.map(test => (
                <ActiveTestCard
                  key={test.id}
                  test={test}
                  onTestAction={handleTestAction}
                  user={user}
                />
              ))
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No active tests</h3>
                <p className="text-gray-600 mb-4">Create your first test to start optimizing your YouTube titles</p>
                <Button onClick={() => setShowCreateTest(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Test
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Create Test Modal */}
        <Dialog open={showCreateTest} onOpenChange={setShowCreateTest}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New A/B Test</DialogTitle>
            </DialogHeader>

            {/* Video Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold">Select a Video</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                {videos.map(video => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedVideo?.id === video.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex space-x-3">
                      <img 
                        src={video.thumbnailUrl} 
                        alt={video.title}
                        className="w-20 h-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{video.title}</p>
                        <p className="text-xs text-gray-500">
                          {formatNumber(video.viewCount)} views • {video.duration}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedVideo && (
              <>
                {/* Title Variants */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Title Variants</h3>
                  {titleInputs.map((title, index) => (
                    <Input
                      key={index}
                      placeholder={`Title variant ${index + 1}${index < 2 ? ' (required)' : ''}`}
                      value={title}
                      onChange={(e) => {
                        const newTitles = [...titleInputs];
                        newTitles[index] = e.target.value;
                        setTitleInputs(newTitles);
                      }}
                    />
                  ))}
                </div>

                {/* Test Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Rotation Interval
                    </label>
                    <Select
                      value={testConfig.rotationIntervalMinutes.toString()}
                      onValueChange={(value) => setTestConfig({
                        ...testConfig,
                        rotationIntervalMinutes: parseInt(value)
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                        <SelectItem value="360">6 hours</SelectItem>
                        <SelectItem value="720">12 hours</SelectItem>
                        <SelectItem value="1440">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Winner Metric
                    </label>
                    <Select
                      value={testConfig.winnerMetric}
                      onValueChange={(value) => setTestConfig({
                        ...testConfig,
                        winnerMetric: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ctr">CTR (Click-through Rate)</SelectItem>
                        <SelectItem value="views">Total Views</SelectItem>
                        <SelectItem value="combined">Combined (CTR + Views)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Start Date
                    </label>
                    <Input
                      type="datetime-local"
                      value={testConfig.startDate}
                      onChange={(e) => setTestConfig({
                        ...testConfig,
                        startDate: e.target.value
                      })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      End Date
                    </label>
                    <Input
                      type="datetime-local"
                      value={testConfig.endDate}
                      onChange={(e) => setTestConfig({
                        ...testConfig,
                        endDate: e.target.value
                      })}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateTest(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTest}
                    disabled={createTestMutation.isPending}
                  >
                    Create Test
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}