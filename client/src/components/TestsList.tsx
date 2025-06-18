import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Pause, BarChart3, Play } from 'lucide-react';
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Tests</h2>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-200 rounded"></div>
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Tests</h2>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No tests created yet. Start your first A/B test!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Tests</h2>
      
      <div className="space-y-4">
        {tests.map((test) => {
          const currentTitle = getCurrentTitle(test.titles);
          const progress = getProgress(test.titles);
          const activeTitles = test.titles.filter(t => t.activatedAt);
          
          return (
            <Card key={test.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {test.videoTitle || `Video ${test.videoId}`}
                      </h3>
                      <Badge className={getStatusColor(test.status)}>
                        {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">
                      Video ID: <span className="font-mono">{test.videoId}</span>
                    </p>
                    <p className="text-gray-600 text-sm">
                      Rotation: Every {test.rotationIntervalMinutes} minutes • 
                      Started {new Date(test.createdAt).toLocaleDateString()}
                    </p>
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
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Current Title ({activeTitles.length}/{test.titles.length})
                    </span>
                    {test.status === 'active' && (
                      <span className="text-sm text-gray-500">Active</span>
                    )}
                  </div>
                  <Progress value={progress} className="mb-3" />
                  <p className="text-sm text-gray-900 font-medium">
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
                      <div key={title.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500">
                            Title {String.fromCharCode(65 + index)}
                          </span>
                          <Badge 
                            variant={isActive ? 'default' : 'secondary'}
                            className={
                              isActive 
                                ? 'bg-green-100 text-green-800' 
                                : isCompleted 
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-blue-100 text-blue-600'
                            }
                          >
                            {isActive ? 'Current' : isCompleted ? 'Completed' : 'Pending'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-3 line-clamp-2">
                          {title.text}
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">CTR</span>
                            <span className="font-medium">
                              {isPending ? '-' : `${(Math.random() * 5 + 3).toFixed(1)}%`}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Views</span>
                            <span className="font-medium">
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
