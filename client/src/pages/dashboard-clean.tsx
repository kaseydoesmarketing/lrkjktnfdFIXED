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
  Activity,
  Trash2,
  RotateCcw,
  StopCircle,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ErrorBoundary, ChartErrorBoundary } from '@/components/ErrorBoundary';

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
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  duration: string;
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

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const ActiveTestCard = ({ test, onTestAction }: { test: Test; onTestAction: (id: string, action: string) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: analytics } = useQuery({
    queryKey: [`/api/tests/${test.id}/analytics`],
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
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
                    {analytics.rotationsCount} rotations
                  </span>
                  <span className="text-sm text-gray-500">
                    Next: {analytics.nextRotationIn > 0 ? `${analytics.nextRotationIn}m` : 'Calculating...'}
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
            {/* Real-time metrics */}
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
                  {analytics.currentTitle}
                </div>
              </div>
            </div>

            {/* Interactive Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              
              {/* CTR Trend Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">CTR Performance Trend</h4>
                </div>
                <div className="h-64">
                  <ChartErrorBoundary>
                    {analytics.rotationLogs && analytics.rotationLogs.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={analytics.rotationLogs.map((log: any, index: number) => ({
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
                  </ChartErrorBoundary>
                </div>
              </div>

              {/* Title Performance Comparison */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Title Performance Comparison</h4>
                </div>
                <div className="h-64">
                  <ChartErrorBoundary>
                    {analytics.rotationLogs && analytics.rotationLogs.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.rotationLogs.map((log: any, index: number) => ({
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
                  </ChartErrorBoundary>
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

export default function DashboardClean() {
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
      return await apiRequest('/api/tests', {
        method: 'POST',
        body: JSON.stringify(testData),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setShowCreateTest(false);
      setSelectedVideo(null);
      setTitleInputs(['', '', '', '', '']);
      toast({ title: 'Test created successfully!' });
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
    <ErrorBoundary>
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
          {/* Real Stats Overview with Animated Transitions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-green-300 group animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  <TestTube className="w-5 h-5 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-green-600 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1 transition-colors duration-300 group-hover:text-green-700">Active Tests</p>
                <p className="text-2xl font-bold text-gray-900 transition-colors duration-300 group-hover:text-green-600">{stats?.activeTests || 0}</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="h-1 bg-gradient-to-r from-green-500 to-green-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-blue-300 group animate-fade-in animation-delay-100">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-600 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1 transition-colors duration-300 group-hover:text-blue-700">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 transition-colors duration-300 group-hover:text-blue-600">{formatNumber(stats?.totalViews || 0)}</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-purple-300 group animate-fade-in animation-delay-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-purple-600 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1 transition-colors duration-300 group-hover:text-purple-700">Avg CTR</p>
                <p className="text-2xl font-bold text-gray-900 transition-colors duration-300 group-hover:text-purple-600">{safeToFixed(stats?.avgCtr || 0, 1)}%</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-orange-300 group animate-fade-in animation-delay-300">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-orange-600 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1 transition-colors duration-300 group-hover:text-orange-700">Completed Tests</p>
                <p className="text-2xl font-bold text-gray-900 transition-colors duration-300 group-hover:text-orange-600">{stats?.completedTests || 0}</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="h-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                </div>
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

        {/* Create Test Modal - Simplified for now */}
        <Dialog open={showCreateTest} onOpenChange={setShowCreateTest}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <TestTube className="w-5 h-5 text-blue-600" />
                <span>Create New A/B Test</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Test creation form would go here */}
              <div className="text-center py-8">
                <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Test creation form coming soon</p>
                <Button
                  onClick={() => setShowCreateTest(false)}
                  className="mt-4"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}