import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  BarChart3, 
  Clock, 
  TrendingUp,
  Eye,
  MousePointer,
  Timer,
  CheckCircle,
  Pause,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Title {
  id: string;
  text: string;
  order: number;
  activatedAt: Date | null;
  isActive: boolean;
}

interface RotationLog {
  id: string;
  titleText: string;
  titleOrder: number;
  rotatedAt: Date;
  durationMinutes: number;
  viewsAtRotation: number;
  ctrAtRotation: number;
  impressionsAtRotation: number;
}

interface Test {
  id: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  status: 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate: Date | null;
  rotationIntervalMinutes: number;
  winnerMetric: 'ctr' | 'avd';
  titles: Title[];
  createdAt: Date;
  updatedAt: Date;
}

interface TestAnalytics {
  testId: string;
  totalViews: number;
  totalImpressions: number;
  averageCtr: number;
  averageAvd: number;
  rotationsCount: number;
  currentTitleIndex: number;
  nextRotationIn: number; // minutes until next rotation
  rotationLogs: RotationLog[];
}

interface Stats {
  activeTests: number;
  completedTests: number;
  totalViews: number;
  averageCtrImprovement: number;
}

// Utility functions
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatTimeAgo = (date: Date | string): string => {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const safeToFixed = (value: number | null | undefined, decimals: number): string => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return value.toFixed(decimals);
};

// Test Card Component with Real-Time Updates
const TestCard: React.FC<{ 
  test: Test; 
  analytics: TestAnalytics;
  onTestAction: (testId: string, action: 'pause' | 'resume' | 'complete' | 'delete') => void;
}> = ({ test, analytics, onTestAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeUntilRotation, setTimeUntilRotation] = useState(analytics.nextRotationIn);

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilRotation(prev => Math.max(0, prev - 1/60)); // Decrease by 1 second
    }, 1000);

    return () => clearInterval(interval);
  }, [analytics.nextRotationIn]);

  // Reset countdown when analytics update
  useEffect(() => {
    setTimeUntilRotation(analytics.nextRotationIn);
  }, [analytics.nextRotationIn]);

  const formatCountdown = (minutes: number): string => {
    const totalSeconds = Math.floor(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const currentTitle = test.titles.find(t => t.order === analytics.currentTitleIndex);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
        <CollapsibleTrigger className="w-full">
          <div className="p-6 flex items-start justify-between">
            <div className="flex-1 text-left">
              <div className="flex items-center space-x-2 mb-2">
                <Badge 
                  className={`
                    ${test.status === 'active' ? 'bg-green-100 text-green-800' :
                    test.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'}
                  `}
                >
                  {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                </Badge>
                <span className="text-xs text-gray-500">
                  {test.titles.length} variants • {test.rotationIntervalMinutes}min intervals
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{test.videoTitle}</h3>
              
              {/* Current Title and Next Rotation Countdown */}
              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Current: {currentTitle?.text || 'Loading...'}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Title {(analytics.currentTitleIndex + 1)} of {test.titles.length}
                    </p>
                  </div>
                  {test.status === 'active' && (
                    <div className="text-right">
                      <div className="flex items-center space-x-2 text-blue-900">
                        <RefreshCw className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Next rotation in
                        </span>
                      </div>
                      <p className="text-lg font-bold text-blue-900">
                        {formatCountdown(timeUntilRotation)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 ml-4">
              {/* Quick Actions */}
              <div className="flex items-center space-x-2 mr-4">
                {test.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTestAction(test.id, 'pause');
                    }}
                    className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                )}
                
                {test.status === 'paused' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTestAction(test.id, 'resume');
                    }}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTestAction(test.id, 'delete');
                  }}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
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
                  {safeToFixed(analytics.averageCtr, 2)}%
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Timer className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Avg Duration</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {Math.floor(analytics.averageAvd / 60)}:{String(analytics.averageAvd % 60).padStart(2, '0')}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-600">Rotations</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {analytics.rotationsCount}
                </div>
              </div>
            </div>

            {/* Title Rotation History - Shows ALL rotations */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Title Rotation History
              </h4>
              {analytics.rotationLogs && analytics.rotationLogs.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analytics.rotationLogs.map((log, index) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {log.titleText}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatTimeAgo(log.rotatedAt)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Title {log.titleOrder + 1}
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
                onClick={() => onTestAction(test.id, 'delete')}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Test
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch tests
  const { data: tests = [], isLoading: testsLoading } = useQuery<Test[]>({
    queryKey: ['/api/tests'],
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch analytics for each test
  const { data: testAnalytics = {} } = useQuery<Record<string, TestAnalytics>>({
    queryKey: ['/api/tests/analytics', tests.map(t => t.id)],
    queryFn: async () => {
      const analyticsPromises = tests.map(test => 
        fetch(`/api/tests/${test.id}/analytics`, {
          credentials: 'include'
        }).then(res => res.json())
      );
      
      const analyticsResults = await Promise.all(analyticsPromises);
      
      return tests.reduce((acc, test, index) => {
        acc[test.id] = analyticsResults[index];
        return acc;
      }, {} as Record<string, TestAnalytics>);
    },
    enabled: tests.length > 0,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Test action mutations
  const testActionMutation = useMutation({
    mutationFn: async ({ testId, action }: { testId: string; action: string }) => {
      const method = action === 'delete' ? 'DELETE' : 'POST';
      const url = action === 'delete' ? `/api/tests/${testId}` : `/api/tests/${testId}/${action}`;
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} test`);
      }
      
      return response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tests/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: action === 'delete' ? 'Test cancelled successfully' : `Test ${action}d successfully`,
      });
    },
    onError: (error, { action }) => {
      toast({
        title: "Error",
        description: `Failed to ${action} test: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleTestAction = (testId: string, action: 'pause' | 'resume' | 'complete' | 'delete') => {
    if (action === 'delete') {
      setTestToDelete(testId);
      setDeleteDialogOpen(true);
    } else {
      testActionMutation.mutate({ testId, action });
    }
  };
  
  const confirmDelete = () => {
    if (testToDelete) {
      testActionMutation.mutate({ testId: testToDelete, action: 'delete' });
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">TitleTesterPro</h1>
            </div>
            <Button
              onClick={() => router.push('/create-test')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Test
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Tests</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.activeTests || 0}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <Skeleton className="h-8 w-20" /> : formatNumber(stats?.totalViews || 0)}
                </p>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg CTR Lift</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : `+${safeToFixed(stats?.averageCtrImprovement || 0, 1)}%`}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.completedTests || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
        </div>

        {/* Active Tests */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Tests</h2>
          {testsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : tests.length === 0 ? (
            <Card className="p-12 text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No active tests</h3>
              <p className="text-gray-600 mb-4">Create your first A/B test to start optimizing your YouTube titles</p>
              <Button
                onClick={() => router.push('/create-test')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Test
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {tests.map(test => (
                <TestCard
                  key={test.id}
                  test={test}
                  analytics={testAnalytics[test.id] || {
                    testId: test.id,
                    totalViews: 0,
                    totalImpressions: 0,
                    averageCtr: 0,
                    averageAvd: 0,
                    rotationsCount: 0,
                    currentTitleIndex: 0,
                    nextRotationIn: 0,
                    rotationLogs: []
                  }}
                  onTestAction={handleTestAction}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this test? This action cannot be undone. 
              All test data and analytics will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTestToDelete(null)}>
              Keep Test
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Cancel Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
