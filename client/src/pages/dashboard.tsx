import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, Pause, CheckCircle, Plus, Eye, TrendingUp,
  Clock, ChevronDown, ChevronUp, BarChart3, Target, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import CreateTestModal from '@/components/CreateTestModal';
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

interface DashboardStats {
  activeTests: number;
  totalViews: number;
  totalImpressions: number;
  averageCtr: number;
}

interface Test {
  id: string;
  videoId: string;
  videoTitle: string;
  thumbnailUrl: string;
  status: 'active' | 'paused' | 'completed';
  rotationInterval: number;
  variants: Array<{
    id: string;
    title: string;
    metrics: {
      views: number;
      impressions: number;
      ctr: number;
      avgDuration: number;
    };
  }>;
  currentVariantIndex: number;
  nextRotationTime: string;
  createdAt: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(0);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);

  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  // Fetch dashboard stats
  const { data: stats = {
    activeTests: 0,
    totalViews: 0,
    totalImpressions: 0,
    averageCtr: 0
  }} = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch active tests
  const { data: tests = [] } = useQuery<Test[]>({
    queryKey: ['/api/tests/active'],
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Delete test mutation
  const deleteTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete test');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Test deleted",
        description: "The test has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete test",
        variant: "destructive",
      });
    },
  });

  // Handle test actions
  const handleTestAction = (testId: string, action: string) => {
    if (action === 'delete') {
      setTestToDelete(testId);
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (testToDelete) {
      deleteTestMutation.mutate(testToDelete);
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    }
  };

  const toggleTest = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.account-selector')) {
        setShowAccountDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <a href="/" className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-[#5865F2] to-[#7C3AED] rounded-lg flex items-center justify-center text-white font-bold">
                  ▶
                </div>
                <span className="font-bold text-xl">TitleTesterPro</span>
              </a>
              <nav className="hidden md:flex space-x-6">
                <a href="/dashboard" className="text-[#5865F2] font-medium">Dashboard</a>
                <a href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
                <a href="/help" className="text-gray-600 hover:text-gray-900">Help</a>
              </nav>
            </div>
            {/* Account Selector */}
            <div className="relative account-selector">
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-gray-50 transition"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-[#5865F2] to-[#7C3AED] rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.charAt(0) || 'M'}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">{user?.youtube_channel_name || 'Maschine Kulture TV'}</div>
                  <div className="text-xs text-gray-500">Pro Plan • 1 Account</div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showAccountDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border overflow-hidden">
                  <div className="p-3 border-b bg-gray-50">
                    <p className="text-sm text-gray-600">Your YouTube Channels (1/1 used)</p>
                  </div>
                  <div className="p-2">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#5865F2] to-[#7C3AED] rounded-full flex items-center justify-center text-white text-sm font-bold">
                            M
                          </div>
                          <div>
                            <div className="text-sm font-semibold">Maschine Kulture TV</div>
                            <div className="text-xs text-gray-600">Primary Account</div>
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-[#5865F2]" />
                      </div>
                    </div>
                    <div className="mt-2 p-3 rounded-lg border border-gray-200 opacity-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                          +
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-400">Add Another Channel</div>
                          <div className="text-xs text-gray-400">Upgrade to Authority</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 border-t">
                    <p className="text-xs text-amber-800">
                      💡 Pro plan includes 1 YouTube channel. Upgrade to Authority for up to 3 channels.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your A/B tests and optimize your titles with data</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Tests</CardTitle>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-[#5865F2]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeTests}</div>
              <p className="text-xs text-green-600 font-medium mt-1">
                ↑ 2 from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Views</CardTitle>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.totalViews / 1000).toFixed(1)}K</div>
              <p className="text-xs text-green-600 font-medium mt-1">
                ↑ 12.4% increase
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Impressions</CardTitle>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[#7C3AED]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.totalImpressions / 1000000).toFixed(1)}M</div>
              <p className="text-xs text-green-600 font-medium mt-1">
                ↑ 8.7% increase
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Average CTR</CardTitle>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.averageCtr || 0).toFixed(1)}%</div>
              <p className="text-xs text-green-600 font-medium mt-1">
                ↑ 1.2% improvement
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Tests Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Active Tests</h2>
        </div>

        {tests.length > 0 ? (
          <div className="space-y-4">
            {tests.map(test => (
              <Card key={test.id} className={expandedTests.has(test.id) ? 'ring-2 ring-[#5865F2]' : ''}>
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => toggleTest(test.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <img
                        src={test.thumbnailUrl}
                        alt={test.videoTitle}
                        className="w-32 h-18 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">
                          {test.videoTitle}
                        </h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span>Active</span>
                          </div>
                          <span>•</span>
                          <span>{test.variants.length} variants</span>
                          <span>•</span>
                          <span>{test.rotationInterval}m rotation</span>
                          <span>•</span>
                          <span>Started {new Date(test.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    {expandedTests.has(test.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedTests.has(test.id) && (
                  <div className="border-t">
                    {/* Test Metrics */}
                    <div className="p-6 bg-gray-50 grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Total Views</div>
                        <div className="text-2xl font-bold">
                          {test.variants.reduce((sum, v) => sum + v.metrics.views, 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Impressions</div>
                        <div className="text-2xl font-bold">
                          {test.variants.reduce((sum, v) => sum + v.metrics.impressions, 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">CTR</div>
                        <div className="text-2xl font-bold">
                          {(test.variants.reduce((sum, v) => sum + v.metrics.ctr, 0) / test.variants.length).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Avg Duration</div>
                        <div className="text-2xl font-bold">
                          {Math.floor(test.variants.reduce((sum, v) => sum + v.metrics.avgDuration, 0) / test.variants.length / 60)}:{(test.variants.reduce((sum, v) => sum + v.metrics.avgDuration, 0) / test.variants.length % 60).toFixed(0).padStart(2, '0')}
                        </div>
                      </div>
                    </div>

                    {/* Title Variants */}
                    <div className="p-6">
                      <h4 className="font-semibold mb-4">Title Performance</h4>
                      <div className="space-y-3">
                        {test.variants.map((variant, index) => (
                          <div
                            key={variant.id}
                            className={`p-4 rounded-lg border ${
                              index === test.currentVariantIndex
                                ? 'border-[#5865F2] bg-blue-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {index === test.currentVariantIndex && (
                                  <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-[#5865F2] rounded mb-2">
                                    ACTIVE
                                  </span>
                                )}
                                <p className="font-medium">{variant.title}</p>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Views: </span>
                                <span className="font-semibold">{variant.metrics.views.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">CTR: </span>
                                <span className="font-semibold">{variant.metrics.ctr.toFixed(1)}%</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Impressions: </span>
                                <span className="font-semibold">{variant.metrics.impressions.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Avg Duration: </span>
                                <span className="font-semibold">{Math.floor(variant.metrics.avgDuration / 60)}:{(variant.metrics.avgDuration % 60).toFixed(0).padStart(2, '0')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Next Rotation Timer */}
                    <div className="p-6 bg-gradient-to-r from-[#5865F2] to-[#7C3AED] text-white">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Next Title Rotation</div>
                        <CountdownTimer targetTime={test.nextRotationTime} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 bg-gray-50 border-t flex justify-end space-x-3">
                      <Button variant="outline" size="sm">Pause Test</Button>
                      <Button variant="outline" size="sm">Edit Variants</Button>
                      <Button variant="outline" size="sm">Complete Test</Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestAction(test.id, 'delete');
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Cancel Test
                      </Button>
                      <Button size="sm" className="bg-[#5865F2] hover:bg-[#4752C4]">
                        View Full Report
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No active tests</h3>
            <p className="text-gray-500 mb-4">Create your first A/B test to start optimizing your video titles</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#5865F2] hover:bg-[#4752C4]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Test
            </Button>
          </Card>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-[#5865F2] to-[#7C3AED] text-white rounded-full px-6 py-3 flex items-center space-x-2 shadow-lg hover:shadow-xl transition-shadow"
      >
        <Plus className="w-5 h-5" />
        <span>Launch New Test</span>
      </button>

      {/* Create Test Modal */}
      <CreateTestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the test and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Test</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cancel Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Countdown Timer Component
function CountdownTimer({ targetTime }: { targetTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetTime).getTime();
      const difference = target - now;

      if (difference > 0) {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('Rotating...');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  return <div className="text-2xl font-bold font-mono">{timeLeft}</div>;
}