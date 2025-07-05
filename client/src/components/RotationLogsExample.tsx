import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw, Clock, TrendingUp } from 'lucide-react';

// Example component showing how to use the rotation logging endpoints
export function RotationLogsExample({ testId }: { testId: string }) {
  // Get complete rotation history with timestamps
  const { data: rotationHistory } = useQuery({
    queryKey: [`/api/tests/${testId}/rotation-history`],
    refetchInterval: 60000 // Update every minute
  });

  // Get real-time rotation status  
  const { data: currentRotation } = useQuery({
    queryKey: [`/api/tests/${testId}/current-rotation`],
    refetchInterval: 30000 // Update every 30 seconds
  });

  // Get comprehensive test logs with performance data
  const { data: testLogs } = useQuery({
    queryKey: [`/api/tests/${testId}/logs`],
    refetchInterval: 60000 // Update every minute
  });

  return (
    <div className="space-y-6">
      {/* Current Rotation Status */}
      {currentRotation && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <RotateCcw className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Current Rotation Status</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Active Title</p>
              <p className="font-medium">{currentRotation.currentTitle || 'Not started'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Rotation In</p>
              <p className="font-medium">{currentRotation.timeUntilNextRotation} minutes</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rotation</p>
              <p className="font-medium">{currentRotation.rotationNumber} of {currentRotation.totalTitles}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Test Status</p>
              <p className="font-medium capitalize">{currentRotation.testStatus}</p>
            </div>
          </div>
        </div>
      )}

      {/* Rotation History */}
      {rotationHistory && rotationHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Rotation History</h3>
          </div>
          
          <div className="space-y-3">
            {rotationHistory.map((rotation: any, index: number) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Title #{rotation.rotationNumber}: {rotation.title}</p>
                    <p className="text-sm text-gray-500">
                      Duration: {rotation.durationMinutes} minutes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{rotation.performance.views} views</p>
                    <p className="text-sm text-gray-500">{rotation.performance.ctr}% CTR</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Summary */}
      {testLogs && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Test Summary</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Rotations</p>
              <p className="text-2xl font-bold">{testLogs.summary.totalRotations}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Successful Updates</p>
              <p className="text-2xl font-bold text-green-600">{testLogs.summary.successfulUpdates}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Failed Updates</p>
              <p className="text-2xl font-bold text-red-600">{testLogs.summary.failedUpdates}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Duration</p>
              <p className="text-2xl font-bold">{testLogs.summary.totalTestDuration} min</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Example of how to fetch individual title performance
export function TitlePerformance({ titleId }: { titleId: string }) {
  const { data: performance } = useQuery({
    queryKey: [`/api/titles/${titleId}/performance`]
  });

  if (!performance) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="font-medium mb-2">{performance.titleText}</h4>
      <div className="space-y-2">
        {performance.performanceHistory.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between text-sm">
            <span>{new Date(entry.timestamp).toLocaleString()}</span>
            <span>{entry.views} views | {entry.ctr}% CTR</span>
          </div>
        ))}
      </div>
    </div>
  );
}