import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Activity,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

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
  status: 'active' | 'paused' | 'completed';
  rotationIntervalMinutes: number;
  titles: Title[];
  createdAt: string;
}

interface RotationStatus {
  testId: string;
  status: string;
  rotationInterval: number;
  totalTitles: number;
  activatedTitles: number;
  currentTitle: {
    id: string;
    text: string;
    order: number;
    activatedAt: string;
    activeDurationMinutes: number;
  } | null;
  nextTitleOrder: number;
  isComplete: boolean;
  recentRotations: Array<{
    titleText: string;
    rotatedAt: string;
    rotationOrder: number;
    minutesAgo: number;
  }>;
  latestAnalytics: any;
  hasValidTokens: boolean;
  schedulerStatus: {
    activeJobs: number;
    jobs: string[];
    uptime: number;
  };
}

export default function Tests() {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch all tests
  const { data: tests = [], isLoading: testsLoading } = useQuery<Test[]>({
    queryKey: ['/api/tests'],
  });

  // Fetch rotation status for selected test
  const { data: rotationStatus, isLoading: statusLoading } = useQuery<RotationStatus>({
    queryKey: [`/api/tests/${selectedTestId}/rotation-status`],
    enabled: !!selectedTestId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Scheduler health check
  const { data: schedulerHealth } = useQuery({
    queryKey: ['/api/scheduler/health'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Mutation for manual rotation
  const rotateMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetch(`/api/tests/${testId}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to rotate');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tests/${selectedTestId}/rotation-status`] });
    },
  });

  // Mutation for reset test
  const resetMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetch(`/api/tests/${testId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to reset');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tests/${selectedTestId}/rotation-status`] });
    },
  });

  // Mutation for pause/resume
  const statusMutation = useMutation({
    mutationFn: async ({ testId, status }: { testId: string; status: 'active' | 'paused' }) => {
      const response = await fetch(`/api/tests/${testId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: [`/api/tests/${selectedTestId}/rotation-status`] });
    },
  });

  const activeTests = tests.filter(test => test.status !== 'completed');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Title Rotation Manager</h1>
          <p className="text-muted-foreground mt-1">Monitor and control your A/B test rotations</p>
        </div>
        
        {/* Scheduler Health */}
        {schedulerHealth && (
          <Card className="bg-muted/50">
            <CardContent className="flex items-center gap-4 p-4">
              <Activity className={cn(
                "h-5 w-5",
                schedulerHealth.healthy ? "text-green-500" : "text-red-500"
              )} />
              <div className="text-sm">
                <p className="font-medium">Scheduler Status</p>
                <p className="text-muted-foreground">
                  {schedulerHealth.activeJobs} active jobs · {schedulerHealth.activeTests} tests running
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Active Tests</CardTitle>
              <CardDescription>Select a test to view rotation details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {testsLoading ? (
                <p className="text-muted-foreground">Loading tests...</p>
              ) : activeTests.length === 0 ? (
                <p className="text-muted-foreground">No active tests found</p>
              ) : (
                activeTests.map(test => (
                  <button
                    key={test.id}
                    onClick={() => setSelectedTestId(test.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      selectedTestId === test.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-1">{test.videoTitle}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={test.status === 'active' ? 'default' : 'secondary'}>
                            {test.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {test.titles.length} titles · {test.rotationIntervalMinutes}min
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rotation Details */}
        <div className="lg:col-span-2">
          {!selectedTestId ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a test to view rotation details</p>
              </CardContent>
            </Card>
          ) : statusLoading ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent>
                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
              </CardContent>
            </Card>
          ) : rotationStatus ? (
            <div className="space-y-4">
              {/* Token Warning */}
              {!rotationStatus.hasValidTokens && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Authentication Required</AlertTitle>
                  <AlertDescription>
                    Your YouTube tokens have expired. Please re-authenticate to continue title rotations.
                  </AlertDescription>
                </Alert>
              )}

              {/* Current Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Rotation Status</CardTitle>
                  <CardDescription>
                    Rotating every {rotationStatus.rotationInterval} minutes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{rotationStatus.activatedTitles} / {rotationStatus.totalTitles} titles</span>
                    </div>
                    <Progress 
                      value={(rotationStatus.activatedTitles / rotationStatus.totalTitles) * 100} 
                      className="h-2"
                    />
                  </div>

                  {/* Current Title */}
                  {rotationStatus.currentTitle && (
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Currently Active</p>
                          <p className="font-medium">{rotationStatus.currentTitle.text}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Active for {rotationStatus.currentTitle.activeDurationMinutes} minutes
                          </p>
                        </div>
                        <Badge variant="outline">
                          Title {rotationStatus.currentTitle.order + 1}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => rotateMutation.mutate(selectedTestId)}
                      disabled={rotateMutation.isPending || rotationStatus.isComplete}
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Rotate Now
                    </Button>
                    
                    <Button
                      onClick={() => statusMutation.mutate({
                        testId: selectedTestId,
                        status: rotationStatus.status === 'active' ? 'paused' : 'active'
                      })}
                      disabled={statusMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      {rotationStatus.status === 'active' ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={() => resetMutation.mutate(selectedTestId)}
                      disabled={resetMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Rotations */}
              {rotationStatus.recentRotations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Rotations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {rotationStatus.recentRotations.map((rotation, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{rotation.titleText}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {rotation.minutesAgo} minutes ago
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Completion Status */}
              {rotationStatus.isComplete && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Test Complete</AlertTitle>
                  <AlertDescription>
                    All titles have been tested. Check your analytics to determine the winner.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Failed to load rotation status</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}