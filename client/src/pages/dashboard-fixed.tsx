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
  // Remove deprecated CTR indicators
}

interface RotationLog {
  id: string;
  titleText: string;
  rotatedAt: string;
  rotationOrder: number;
  durationMinutes: number;
  viewsAtRotation: number;
  ctrAtRotation: number;
}

interface TestAnalytics {
  totalViews: number;
  totalImpressions: number;
  averageCtr: number;
  averageViewDuration: number;
  rotationsCount: number;
  currentTitleIndex: number;
  currentTitle: string;
  lastRotation: string;
  nextRotationIn: number; // minutes
  rotationLogs: RotationLog[];
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
  analytics?: TestAnalytics;
}

interface Stats {
  activeTests: number;
  totalViews: number; // Real views from active tests only
  avgCtr: number;
  avgViewDuration: number; // Real AVD per test
  completedTests: number; // Only truly completed tests
}

// Utility functions
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

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return <Play className="w-4 h-4" />;
    case 'paused': return <Pause className="w-4 h-4" />;
    case 'completed': return <CheckCircle className="w-4 h-4" />;
    case 'cancelled': return <StopCircle className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
};

const ActiveTestCard: React.FC<{ test: Test; onTestAction: (testId: string, action: string) => void }> = ({ test, onTestAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const analytics = test.analytics || {
    totalViews: 0,
    totalImpressions: 0,
    averageCtr: 0,
    averageViewDuration: 0,
    rotationsCount: 0,
    currentTitleIndex: 0,
    currentTitle: 'No active title',
    lastRotation: test.createdAt,
    nextRotationIn: 0,
    rotationLogs: []
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
                  <Badge className={`${getStatusColor(test.status)} flex items-center space-x-1`}>
                    {getStatusIcon(test.status)}
                    <span>{test.status.charAt(0).toUpperCase() + test.status.slice(1)}</span>
                  </Badge>
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
                  <span className="text-sm font-medium text-gray-600">Real Total Views</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {formatNumber(analytics.totalViews)}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <MousePointer className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Real Avg CTR</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {safeToFixed(analytics.averageCtr, 1)}%
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Real AVD</span>
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

            {/* Time until next rotation */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Timer className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Next Title Change</span>
              </div>
              <div className="text-lg font-bold text-blue-900">
                {analytics.nextRotationIn > 0 
                  ? `In ${analytics.nextRotationIn} minutes` 
                  : 'Calculating next rotation...'}
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
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analytics.rotationLogs.map((log, index) => ({
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
                        formatter={(value) => [`${Number(value).toFixed(2)}%`, 'CTR']}
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
                </div>
              </div>

              {/* Title Performance Comparison */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Title Performance Comparison</h4>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.rotationLogs.map((log, index) => ({
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
                        formatter={(value, name) => [
                          name === 'views' ? formatNumber(Number(value)) : `${Number(value).toFixed(2)}%`,
                          name === 'views' ? 'Views' : 'CTR'
                        ]}
                        labelFormatter={(label, payload) => {
                          const data = payload?.[0]?.payload;
                          return data?.fullName || label;
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
                </div>
              </div>

            </div>

            {/* Real-time Analytics Dashboard */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center space-x-2 mb-6">
                <Activity className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-gray-900">Real-time Performance Analytics</h4>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Performance Distribution Pie Chart */}
                <div className="xl:col-span-1">
                  <h5 className="font-medium text-gray-700 mb-3">Title Performance Share</h5>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.rotationLogs.map((log, index) => ({
                            name: `Title ${index + 1}`,
                            value: log.viewsAtRotation || 0,
                            color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={1000}
                        >
                          {analytics.rotationLogs.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [formatNumber(Number(value)), 'Views']}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Time-based Performance Line Chart */}
                <div className="xl:col-span-2">
                  <h5 className="font-medium text-gray-700 mb-3">Performance Over Time</h5>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={analytics.rotationLogs.map((log, index) => ({
                          time: `${Math.floor(index * 60 / 60)}h`,
                          ctr: log.ctrAtRotation || 0,
                          views: (log.viewsAtRotation || 0) / 1000,
                          engagement: ((log.ctrAtRotation || 0) * (log.viewsAtRotation || 0)) / 10000
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="time" 
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
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value, name) => [
                            name === 'ctr' ? `${Number(value).toFixed(2)}%` : 
                            name === 'views' ? `${(Number(value) * 1000).toLocaleString()}` :
                            Number(value).toFixed(2),
                            name === 'ctr' ? 'CTR' : 
                            name === 'views' ? 'Views' : 'Engagement Score'
                          ]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="ctr" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                          animationBegin={0}
                          animationDuration={2000}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="views" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                          animationBegin={500}
                          animationDuration={2000}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="engagement" 
                          stroke="#8B5CF6" 
                          strokeWidth={3}
                          dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                          animationBegin={1000}
                          animationDuration={2000}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>

            {/* Complete title change log */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <History className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Complete Title Change Log</h4>
              </div>

              {analytics.rotationLogs.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {analytics.rotationLogs.map((log, index) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          Title changed to: "{log.titleText}"
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatTimeAgo(log.rotatedAt)} • Active for {formatDuration(log.durationMinutes || 0)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatNumber(log.viewsAtRotation)} views
                        </div>
                        <div className="text-xs text-gray-500">
                          {safeToFixed(log.ctrAtRotation, 1)}% CTR
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

            {/* Test actions */}
            <div className="flex flex-wrap gap-2">
              {test.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTestAction(test.id, 'pause')}
                  className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Test
                </Button>
              )}
              
              {test.status === 'paused' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTestAction(test.id, 'resume')}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume Test
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => onTestAction(test.id, 'complete')}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Test
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onTestAction(test.id, 'cancel')}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Cancel Test
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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
    refetchInterval: 30 * 1000, // Every 30 seconds for real-time updates
  });

  const { data: tests = [], isLoading: testsLoading } = useQuery<Test[]>({
    queryKey: ['/api/tests'],
    enabled: !!user,
    retry: false,
    refetchInterval: 30 * 1000, // Every 30 seconds for real-time updates
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
        cancel: 'Test cancelled successfully',
        delete: 'Test deleted permanently'
      };
      
      toast({ 
        title: actionMessages[variables.action as keyof typeof actionMessages] || 'Action completed'
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to perform action', 
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
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create test', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const handleLogout = async () => {
    try {
      // Call logout API to clear server-side session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout API failed:', error);
    }
    
    // Always redirect to login regardless of API response
    window.location.href = '/login';
  };

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
  const completedTests = tests.filter((test: Test) => test.status === 'completed');
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
        {/* Real Stats Overview */}
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
              <p className="text-sm font-medium text-gray-600 mb-1">Real Total Views</p>
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
              <p className="text-sm font-medium text-gray-600 mb-1">Real Avg CTR</p>
              <p className="text-2xl font-bold text-gray-900">{safeToFixed(stats?.avgCtr || 0, 1)}%</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm card-hover">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
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

        {/* Completed Tests Section */}
        {completedTests.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Completed Tests</h2>
                <p className="text-gray-600 mt-1">Successfully finished A/B tests</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedTests.map((test: Test) => (
                <div key={test.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={getStatusColor(test.status)}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestAction(test.id, 'delete')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2 truncate">{test.videoTitle}</h3>
                  <div className="text-sm text-gray-500">
                    Completed {formatTimeAgo(test.endDate || test.createdAt)}
                  </div>
                  {test.analytics && (
                    <div className="mt-3 text-sm">
                      <div className="text-gray-600">
                        {formatNumber(test.analytics.totalViews)} views • {safeToFixed(test.analytics.averageCtr, 1)}% CTR
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Tests Section */}
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
                          {getStatusIcon(test.status)}
                          <span className="ml-1">{test.status.charAt(0).toUpperCase() + test.status.slice(1)}</span>
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Created {formatTimeAgo(test.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="text-right mr-4">
                      <div className="text-sm font-medium text-gray-900">
                        {test.analytics ? `${safeToFixed(test.analytics.averageCtr, 1)}% CTR` : 'No data'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {test.analytics ? formatNumber(test.analytics.totalViews) + ' views' : 'No views'}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {test.status === 'paused' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestAction(test.id, 'resume')}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {test.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestAction(test.id, 'pause')}
                        className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    )}

                    {(test.status === 'active' || test.status === 'paused') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestAction(test.id, 'complete')}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestAction(test.id, test.status === 'completed' ? 'delete' : 'cancel')}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      {test.status === 'completed' ? <Trash2 className="w-4 h-4" /> : <StopCircle className="w-4 h-4" />}
                    </Button>
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

      {/* Create Test Modal - Will show real YouTube thumbnails and accurate CTR */}
      <Dialog open={showCreateTest} onOpenChange={setShowCreateTest}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-2 border-gray-200 shadow-2xl">
          <DialogHeader className="bg-white border-b border-gray-100 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Create New A/B Test</DialogTitle>
            <p className="text-gray-600">Select a video and configure your title testing parameters</p>
          </DialogHeader>
          
          <div className="space-y-6 bg-white p-6">
            {/* Video Selection with Real Thumbnails */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-medium text-gray-900 mb-3 block">Select Video</Label>
              {videosLoading ? (
                <div className="flex items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-gray-700 font-medium">Loading your YouTube videos...</p>
                  </div>
                </div>
              ) : videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-white">
                  {videos.map((video: Video) => (
                    <div
                      key={video.id}
                      onClick={() => setSelectedVideo(video)}
                      className={`cursor-pointer rounded-lg border-2 p-3 transition-all bg-white shadow-sm ${
                        selectedVideo?.id === video.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-300 hover:border-blue-300 hover:bg-blue-25 hover:shadow-md'
                      }`}
                    >
                      <div className="flex space-x-3">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-24 h-16 object-cover rounded border border-gray-200"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">{video.title}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{formatNumber(video.viewCount)} views</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{video.duration}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(video.publishedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                  <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-700 font-medium">No videos found. Please check your YouTube channel connection.</p>
                </div>
              )}
            </div>

            {/* Title Variants */}
            {selectedVideo && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
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
                        className="pr-16 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                        maxLength={100}
                      />
                      <div className="absolute right-3 top-3 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {title.length}/100
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Configuration */}
            {selectedVideo && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <Label className="text-sm font-medium text-gray-900 mb-4 block">Test Configuration</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-2 block">
                      Rotation Interval
                    </Label>
                    <Select
                      value={testConfig.rotationIntervalMinutes.toString()}
                      onValueChange={(value) => 
                        setTestConfig({...testConfig, rotationIntervalMinutes: parseInt(value)})
                      }
                    >
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-300">
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
                    <Label className="text-sm font-medium text-gray-900 mb-2 block">
                      Winner Determination
                    </Label>
                    <Select
                      value={testConfig.winnerMetric}
                      onValueChange={(value) => 
                        setTestConfig({...testConfig, winnerMetric: value})
                      }
                    >
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-300">
                        <SelectItem value="ctr">Highest CTR</SelectItem>
                        <SelectItem value="views">Highest Views</SelectItem>
                        <SelectItem value="combined">Combined Metrics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-2 block">
                      Start Date
                    </Label>
                    <Input
                      type="datetime-local"
                      value={testConfig.startDate}
                      onChange={(e) => 
                        setTestConfig({...testConfig, startDate: e.target.value})
                      }
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-2 block">
                      End Date
                    </Label>
                    <Input
                      type="datetime-local"
                      value={testConfig.endDate}
                      onChange={(e) => 
                        setTestConfig({...testConfig, endDate: e.target.value})
                      }
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 bg-white">
              <Button
                variant="outline"
                onClick={() => setShowCreateTest(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTest}
                disabled={!selectedVideo || titleInputs.filter(t => t.trim()).length < 2 || createTest.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg"
              >
                {createTest.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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