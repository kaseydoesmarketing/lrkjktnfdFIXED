// client/src/pages/Tests.tsx - Fixed version
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Play, Pause, Trash2, Plus, RotateCw, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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

// Define the shape of the test data based on the schema
interface Title {
  id: string;
  text: string;
  order: number;
  isActive: boolean;
  activatedAt: string | null;
}

interface Test {
  id: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  rotationIntervalMinutes: number;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  titles: Title[];
}

export default function Tests() {
  const queryClient = useQueryClient();
  const [deleteTestId, setDeleteTestId] = React.useState<string | null>(null);
  const [rotatingTestId, setRotatingTestId] = React.useState<string | null>(null);

  // Fetch tests with proper error handling
  const { data: tests = [], isLoading, error } = useQuery<Test[]>({
    queryKey: ['tests'],
    queryFn: async () => {
      const response = await fetch('/api/tests', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load tests' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validate data structure
      if (!Array.isArray(data)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }
      
      return data as Test[];
    },
    retry: 1,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update test status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ testId, status }: { testId: string; status: 'active' | 'paused' }) => {
      const response = await fetch(`/api/tests/${testId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update test status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      toast({
        title: 'Success',
        description: 'Test status updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Manual rotation mutation
  const rotateMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetch(`/api/tests/${testId}/rotate`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to trigger rotation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      toast({
        title: 'Success',
        description: 'Title rotation triggered successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete test mutation
  const deleteMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      toast({
        title: 'Success',
        description: 'Test deleted successfully',
      });
      setDeleteTestId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleStatusToggle = (test: Test) => {
    const newStatus = test.status === 'active' ? 'paused' : 'active';
    updateStatusMutation.mutate({ testId: test.id, status: newStatus });
  };

  const handleManualRotation = async (testId: string) => {
    setRotatingTestId(testId);
    try {
      await rotateMutation.mutateAsync(testId);
    } finally {
      setRotatingTestId(null);
    }
  };

  const getActiveTitle = (test: Test) => {
    return test.titles.find(t => t.isActive);
  };

  const getTestProgress = (test: Test) => {
    const activatedCount = test.titles.filter(t => t.activatedAt).length;
    return {
      current: activatedCount,
      total: test.titles.length,
      percentage: (activatedCount / test.titles.length) * 100,
    };
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error Loading Tests</h3>
          </div>
          <p className="text-red-600 mt-1">{error.message}</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['tests'] })}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">A/B Tests</h1>
        <Link href="/tests/create">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Test
          </button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">No tests yet</h3>
          <p className="text-gray-600 mb-4">Create your first A/B test to start optimizing your titles</p>
          <Link href="/tests/create">
            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Create Your First Test
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => {
            const activeTitle = getActiveTitle(test);
            const progress = getTestProgress(test);
            const isRotating = rotatingTestId === test.id;

            return (
              <div key={test.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="relative">
                  <img
                    src={test.videoThumbnail}
                    alt={test.videoTitle}
                    className="w-full h-48 object-cover"
                  />
                  <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-medium ${
                    test.status === 'active' ? 'bg-green-500 text-white' :
                    test.status === 'paused' ? 'bg-yellow-500 text-white' :
                    test.status === 'completed' ? 'bg-blue-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{test.videoTitle}</h3>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{progress.current}/{progress.total} titles tested</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>

                  {activeTitle && (
                    <div className="mb-3 p-2 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Current Title:</p>
                      <p className="font-medium line-clamp-2">{activeTitle.text}</p>
                    </div>
                  )}

                  <div className="text-sm text-gray-600 mb-3">
                    <p>Rotation: Every {test.rotationIntervalMinutes} minutes</p>
                    <p>Created: {new Date(test.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex gap-2">
                    {test.status !== 'completed' && test.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={() => handleStatusToggle(test)}
                          className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-1 text-sm ${
                            test.status === 'active'
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                          disabled={updateStatusMutation.isPending}
                        >
                          {test.status === 'active' ? (
                            <>
                              <Pause className="h-4 w-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Resume
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleManualRotation(test.id)}
                          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1 text-sm"
                          disabled={isRotating || test.status !== 'active'}
                          title="Manually trigger rotation to next title"
                        >
                          <RotateCw className={`h-4 w-4 ${isRotating ? 'animate-spin' : ''}`} />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setDeleteTestId(test.id)}
                      className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded flex items-center gap-1 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTestId} onOpenChange={() => setDeleteTestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this test and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTestId && deleteMutation.mutate(deleteTestId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}