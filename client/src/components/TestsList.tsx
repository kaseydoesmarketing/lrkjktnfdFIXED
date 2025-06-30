import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Pause, BarChart3, Play, Search, Filter, MoreVertical, Trash2, Copy, Settings } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Test {
  id: string;
  videoId: string;
  videoTitle?: string;
  rotationIntervalMinutes: number;
  status: string;
  createdAt: string;
  titles: Array<{
    id: string;
    text: string;
    order: number;
    activatedAt?: string;
  }>;
}

interface TestsListProps {
  tests?: Test[];
  isLoading: boolean;
  onSelectTest: (testId: string) => void;
}

export default function TestsList({ tests, isLoading, onSelectTest }: TestsListProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ testId, status }: { testId: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/tests/${testId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      toast({
        title: 'Success',
        description: 'Test status updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update test status',
        variant: 'destructive',
      });
    },
  });

  const handleStatusToggle = (testId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    updateStatusMutation.mutate({ testId, status: newStatus });
  };

  const handleBulkStatusChange = (status: string) => {
    selectedTests.forEach(testId => {
      updateStatusMutation.mutate({ testId, status });
    });
    setSelectedTests([]);
    setShowBulkActions(false);
  };

  const handleSelectTest = (testId: string, checked: boolean) => {
    if (checked) {
      setSelectedTests([...selectedTests, testId]);
    } else {
      setSelectedTests(selectedTests.filter(id => id !== testId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && tests) {
      setSelectedTests(tests.map(test => test.id));
    } else {
      setSelectedTests([]);
    }
  };

  const filteredTests = tests?.filter(test => {
    const matchesSearch = !searchQuery || 
      test.videoTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.videoId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getCurrentTitle = (titles: Test['titles']) => {
    const activeTitles = titles.filter(t => t.activatedAt);
    if (activeTitles.length === 0) return titles[0];
    return activeTitles[activeTitles.length - 1];
  };

  const getProgress = (titles: Test['titles']) => {
    const activeTitles = titles.filter(t => t.activatedAt);
    return (activeTitles.length / titles.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Active Tests</h2>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!tests || tests.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Active Tests</h2>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">No tests created yet. Start your first A/B test!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold text-white">Tests ({filteredTests.length})</h2>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 w-full sm:w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32 bg-gray-800 border-gray-700 text-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedTests.length > 0 && (
        <Card className="bg-blue-900/20 border-blue-500/30 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-blue-200">
                  {selectedTests.length} test{selectedTests.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange('active')}
                  className="text-green-400 border-green-400/30 hover:bg-green-400/10"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Resume All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange('paused')}
                  className="text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
                >
                  <Pause className="w-4 h-4 mr-1" />
                  Pause All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTests([])}
                  className="text-gray-400 border-gray-400/30 hover:bg-gray-400/10"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tests List */}
      <div className="space-y-4">
        {filteredTests.map((test) => {
          const currentTitle = getCurrentTitle(test.titles);
          const progress = getProgress(test.titles);
          const activeTitles = test.titles.filter(t => t.activatedAt);
          
          return (
            <Card key={test.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-3 flex-1">
                    <Checkbox
                      checked={selectedTests.includes(test.id)}
                      onCheckedChange={(checked) => handleSelectTest(test.id, !!checked)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {test.videoTitle || `Video ${test.videoId}`}
                        </h3>
                        <Badge className={getStatusColor(test.status)}>
                          {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">
                        Video ID: <span className="font-mono">{test.videoId}</span>
                      </p>
                      <p className="text-gray-400 text-sm">
                        Rotation: Every {test.rotationIntervalMinutes} minutes • 
                        Started {new Date(test.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {test.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusToggle(test.id, test.status)}
                        disabled={updateStatusMutation.isPending}
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    ) : test.status === 'paused' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusToggle(test.id, test.status)}
                        disabled={updateStatusMutation.isPending}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectTest(test.id)}
                      className="text-primary border-primary/20 hover:bg-primary/5"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      View Results
                    </Button>
                  </div>
                </div>

                {/* Test Progress */}
                <div className="bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-300">
                      Current Title ({activeTitles.length}/{test.titles.length})
                    </span>
                    {test.status === 'active' && (
                      <span className="text-sm text-gray-400">Active</span>
                    )}
                  </div>
                  <Progress value={progress} className="mb-3" />
                  <p className="text-sm text-white font-medium">
                    "{currentTitle.text}"
                  </p>
                </div>

                {/* Title Variants Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {test.titles.slice(0, 3).map((title, index) => {
                    const isActive = currentTitle.id === title.id;
                    const isCompleted = title.activatedAt && !isActive;
                    const isPending = !title.activatedAt;
                    
                    return (
                      <div key={title.id} className="border border-gray-600 bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400">
                            Title {String.fromCharCode(65 + index)}
                          </span>
                          <Badge 
                            variant={isActive ? 'default' : 'secondary'}
                            className={
                              isActive 
                                ? 'bg-green-500 text-white' 
                                : isCompleted 
                                  ? 'bg-gray-500 text-white'
                                  : 'bg-blue-500 text-white'
                            }
                          >
                            {isActive ? 'Current' : isCompleted ? 'Completed' : 'Pending'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-white mb-3 line-clamp-2">
                          {title.text}
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">CTR</span>
                            <span className="font-medium text-white">
                              {isPending ? '-' : `${(Math.random() * 5 + 3).toFixed(1)}%`}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Views</span>
                            <span className="font-medium text-white">
                              {isPending ? '-' : Math.floor(Math.random() * 1000 + 500).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
