import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Play, 
  TestTube, 
  TrendingUp, 
  Target, 
  LogOut, 
  Eye, 
  Plus, 
  Clock, 
  ArrowUpRight, 
  Pause,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  MousePointer,
  PlaySquare,
  Trash2,
  Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

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

// Safe number formatting functions
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const safeToFixed = (num: number | undefined, decimals: number): string => {
  return (num || 0).toFixed(decimals);
};

const ActiveTestCard = ({ test, onTestAction }: { test: Test; onTestAction: (id: string, action: string) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: analytics } = useQuery({
    queryKey: [`/api/tests/${test.id}/analytics`],
    refetchInterval: 30 * 1000,
  });

  if (!analytics) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const rotationsCount = analytics?.rotationsCount || 0;
  const nextRotationIn = analytics?.nextRotationIn || 0;
  const averageCtr = analytics?.averageCtr || 0;
  const totalViews = analytics?.totalViews || 0;
  const averageViewDuration = analytics?.averageViewDuration || 0;
  const currentTitle = analytics?.currentTitle || 'N/A';
  const rotationLogs = analytics?.rotationLogs || [];

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        <CollapsibleTrigger className="w-full p-6 text-left">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <Badge 
                  className={`${
                    test.status === 'active' ? 'bg-green-100 text-green-800' :
                    test.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                </Badge>
                <span className="text-xs text-gray-500">
                  {test.titles.length} variants • {test.rotationIntervalMinutes}min intervals
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{test.videoTitle}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm text-gray-500">
                    {rotationsCount} rotations
                  </span>
                  <span className="text-sm text-gray-500">
                    Next: {nextRotationIn > 0 ? `${nextRotationIn}m` : 'Calculating...'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {safeToFixed(averageCtr, 1)}%
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
            {/* Real-time metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total Views</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {formatNumber(totalViews)}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <MousePointer className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Avg CTR</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {safeToFixed(averageCtr, 1)}%
                </div>
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
                <div className="text-sm font-medium text-gray-900 truncate">
                  {currentTitle}
                </div>
              </div>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              
              {/* CTR Trend Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">CTR Performance Trend</h4>
                </div>
                <div className="h-64">
                  {rotationLogs && rotationLogs.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={rotationLogs.map((log: any, index: number) => ({
                          name: `Title ${index + 1}`,
                          ctr: log.ctrAtRotation || 0,
                          views: log.viewsAtRotation || 0,
                          duration: log.durationMinutes || 0
                        }))}
                      >
                        <defs>
                          <linearGradient id="ctrGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#6B7280"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#6B7280"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'CTR']}
                        />
                        <Area
                          type="monotone"
                          dataKey="ctr"
                          stroke="#3B82F6"
                          strokeWidth={3}
                          fill="url(#ctrGradient)"
                          animationBegin={0}
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No data available</p>
                        <p className="text-sm">Start a test to see CTR trends</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Title Performance Comparison */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Title Performance Comparison</h4>
                </div>
                <div className="h-64">
                  {rotationLogs && rotationLogs.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={rotationLogs.map((log: any, index: number) => ({
                          name: `T${index + 1}`,
                          fullName: log.titleText?.length > 30 ? log.titleText.substring(0, 30) + '...' : log.titleText,
                          views: log.viewsAtRotation || 0,
                          ctr: log.ctrAtRotation || 0
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#6B7280"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#6B7280"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatNumber(value)}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar 
                          dataKey="views" 
                          fill="#10B981" 
                          radius={[4, 4, 0, 0]}
                          animationBegin={300}
                          animationDuration={1200}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No comparison data</p>
                        <p className="text-sm">Run tests to compare performance</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Test Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                {test.status === 'active' && (
                  <Button
                    onClick={() => onTestAction(test.id, 'pause')}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </Button>
                )}
                
                {test.status === 'paused' && (
                  <Button
                    onClick={() => onTestAction(test.id, 'resume')}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <Play className="w-4 h-4" />
                    <span>Resume</span>
                  </Button>
                )}
                
                {(test.status === 'active' || test.status === 'paused') && (
                  <Button
                    onClick={() => onTestAction(test.id, 'complete')}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete</span>
                  </Button>
                )}
              </div>

              <Button
                onClick={() => onTestAction(test.id, 'cancel')}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Cancel Test</span>
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default function DashboardProduction() {
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

  // Real-time data fetching
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
    retry: false,
    refetchInterval: 30 * 1000,
  });

  const { data: tests = [], isLoading: testsLoading } = useQuery<Test[]>({
    queryKey: ['/api/tests'],
    enabled: !!user,
    retry: false,
    refetchInterval: 30 * 1000,
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ['/api/videos/recent'],
    enabled: !!user && showCreateTest,
    retry: false,
  });

  // Test management mutations
  const testActionMutation = useMutation({
    mutationFn: async ({ testId, action }: { testId: string; action: string }) => {
      const response = await fetch(`/api/tests/${testId}/${action}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to perform action');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      const actionMessages = {
        pause: 'Test paused successfully',
        resume: 'Test resumed successfully', 
        complete: 'Test completed successfully',
        cancel: 'Test cancelled successfully'
      };
      
      toast({ 
        title: actionMessages[variables.action as keyof typeof actionMessages] || 'Action completed successfully' 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Action failed', 
        description: error.message,
        variant: 'destructive' 
      });
    }
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
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to create test', 
        description: error.message,
        variant: 'destructive' 
      });
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

  const handleLogout = () => logoutMutation.mutate();

  const handleTestAction = (testId: string, action: string) => {
    testActionMutation.mutate({ testId, action });
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
      {/* Fixed Header */}
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
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-sm text-gray-700 hidden sm:block">{user?.name}</span>
                {user?.email === 'kaseydoesmarketing@gmail.com' && (
                  <Badge 
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold border border-yellow-300 shadow-lg animate-pulse cursor-pointer hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200"
                    onClick={() => window.location.href = '/admin'}
                  >
                    ✨ Founder
                  </Badge>
                )}
                {user?.email !== 'kaseydoesmarketing@gmail.com' && (
                  <Badge 
                    className="bg-gradient-to-r from-red-400 to-red-600 text-white font-bold border border-red-300 shadow-lg cursor-pointer hover:from-red-500 hover:to-red-700 transition-all duration-200"
                    onClick={() => {
                      // Logout current user and redirect to founder login
                      localStorage.removeItem('sessionToken');
                      document.cookie = 'session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                      window.location.href = '/login?founder=kasey2024';
                    }}
                  >
                    🔑 Login as Founder
                  </Badge>
                )}
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-green-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <TestTube className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-600 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Active Tests</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeTests || 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-blue-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-blue-600 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats?.totalViews || 0)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-purple-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Target className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-purple-600 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Avg CTR</p>
              <p className="text-2xl font-bold text-gray-900">{safeToFixed(stats?.avgCtr || 0, 1)}%</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-orange-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-orange-600 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
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
              <p className="text-gray-600 mt-1">Real-time A/B testing with live analytics</p>
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
                <ActiveTestCard 
                  key={test.id} 
                  test={test} 
                  onTestAction={handleTestAction}
                />
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
      </div>

      {/* Create Test Modal */}
      <Dialog open={showCreateTest} onOpenChange={setShowCreateTest}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-2 border-gray-200 shadow-2xl">
          <DialogHeader className="bg-white border-b border-gray-100 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Create New A/B Test</DialogTitle>
            <p className="text-gray-600">Select a video and configure your title testing parameters</p>
          </DialogHeader>
          
          <div className="space-y-6 bg-white p-6">
            {/* Video Selection */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="text-sm font-medium text-gray-900 mb-3 block">Select Video</label>
              {videosLoading ? (
                <div className="flex items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-gray-700 font-medium">Loading your YouTube videos...</p>
                  </div>
                </div>
              ) : videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-white">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => setSelectedVideo(video)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedVideo?.id === video.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex space-x-3">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-20 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{video.title}</h4>
                          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                            <span>{formatNumber(video.viewCount)} views</span>
                            <span>•</span>
                            <span>{video.duration}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                  <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium mb-2">No videos found</p>
                  <p className="text-sm text-gray-500">Make sure your channel has recent videos</p>
                </div>
              )}
            </div>

            {/* Title Variants */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="text-sm font-medium text-gray-900 mb-3 block">Title Variants (2-5 titles)</label>
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
                      className={`bg-white border-gray-300 text-gray-900 placeholder-gray-500 ${
                        index < 2 && !title.trim() ? 'border-red-300' : ''
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Test Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="text-sm font-medium text-gray-900 mb-2 block">Rotation Interval</label>
                <Select
                  value={testConfig.rotationIntervalMinutes.toString()}
                  onValueChange={(value) => setTestConfig(prev => ({ ...prev, rotationIntervalMinutes: parseInt(value) }))}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-300 shadow-lg">
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                    <SelectItem value="720">12 hours</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="text-sm font-medium text-gray-900 mb-2 block">Winner Determination</label>
                <Select
                  value={testConfig.winnerMetric}
                  onValueChange={(value) => setTestConfig(prev => ({ ...prev, winnerMetric: value }))}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-300 shadow-lg">
                    <SelectItem value="ctr">Highest CTR</SelectItem>
                    <SelectItem value="views">Highest Views</SelectItem>
                    <SelectItem value="combined">Combined Metrics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Test Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="text-sm font-medium text-gray-900 mb-2 block">Start Date & Time</label>
                <Input
                  type="datetime-local"
                  value={testConfig.startDate}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="text-sm font-medium text-gray-900 mb-2 block">End Date & Time</label>
                <Input
                  type="datetime-local"
                  value={testConfig.endDate}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowCreateTest(false)}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTest}
                disabled={!selectedVideo || titleInputs.filter(t => t.trim()).length < 2 || createTest.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {createTest.isPending ? (
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
        </DialogContent>
      </Dialog>
    </div>
  );
}