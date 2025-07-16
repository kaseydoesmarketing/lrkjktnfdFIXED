import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Play, 
  Pause, 
  Plus, 
  BarChart3, 
  Clock, 
  Target,
  Youtube,
  Zap,
  TrendingUp,
  Users
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionStatus: string;
}

interface Test {
  id: string;
  videoId: string;
  videoTitle: string;
  status: 'active' | 'paused' | 'completed';
  rotationIntervalMinutes: number;
  currentTitleIndex: number;
  titles: Array<{
    id: string;
    text: string;
    order: number;
    isActive: boolean;
  }>;
  createdAt: string;
}

interface QuotaStatus {
  used: number;
  remaining: number;
  limit: number;
  resetTime: string;
}

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery<{
    user: User;
    hasReadAccess: boolean;
    hasWriteAccess: boolean;
    youtubeChannel: any;
  }>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user');
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
  });

  const { data: tests = [] } = useQuery<Test[]>({
    queryKey: ['/api/tests/active'],
    queryFn: async () => {
      const response = await fetch('/api/tests/active');
      if (!response.ok) throw new Error('Failed to fetch tests');
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: quotaStatus } = useQuery<QuotaStatus>({
    queryKey: ['/api/quota/status'],
    queryFn: async () => {
      const response = await fetch('/api/quota/status');
      if (!response.ok) throw new Error('Failed to fetch quota');
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const pauseTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetch(`/api/tests/${testId}/pause`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to pause test');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests/active'] });
    },
  });

  const resumeTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetch(`/api/tests/${testId}/resume`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to resume test');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests/active'] });
    },
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Youtube className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to TitleTesterPro</h1>
          <p className="text-gray-600 mb-6">Connect your YouTube account to start A/B testing your video titles</p>
          <div className="space-y-3">
            <a
              href="/auth/google/read"
              className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect YouTube (Read Access)
            </a>
            <a
              href="/auth/google/write"
              className="block w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Connect YouTube (Write Access)
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Youtube className="h-8 w-8 text-red-500 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">TitleTesterPro</h1>
            </div>
            <div className="flex items-center space-x-4">
              {quotaStatus && (
                <div className="text-sm text-gray-600">
                  Quota: {quotaStatus.used}/{quotaStatus.limit}
                </div>
              )}
              <div className="text-sm text-gray-600">
                {user.user.name}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Tests</p>
                  <p className="text-2xl font-bold text-gray-900">{tests.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">API Quota Used</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {quotaStatus ? `${quotaStatus.used}/${quotaStatus.limit}` : '0/200'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Read Access</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {user.hasReadAccess ? '✓' : '✗'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Write Access</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {user.hasWriteAccess ? '✓' : '✗'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Active Tests</h3>
          </div>
          
          {tests.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No active tests</h3>
              <p className="text-gray-600 mb-4">Create your first A/B test to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Test
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tests.map((test) => (
                <div key={test.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{test.videoTitle}</h4>
                      <p className="text-sm text-gray-600">Video ID: {test.videoId}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        test.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {test.status}
                      </span>
                      <button
                        onClick={() => {
                          if (test.status === 'active') {
                            pauseTestMutation.mutate(test.id);
                          } else {
                            resumeTestMutation.mutate(test.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        {test.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Title Variants</p>
                      <div className="space-y-1">
                        {test.titles.map((title, index) => (
                          <div
                            key={title.id}
                            className={`p-2 text-sm rounded ${
                              index === test.currentTitleIndex
                                ? 'bg-blue-100 text-blue-800 font-medium'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {title.text}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Test Settings</p>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Rotation: {Math.floor(test.rotationIntervalMinutes / 60)}h intervals
                        </div>
                        <div className="flex items-center">
                          <Target className="h-4 w-4 mr-2" />
                          Current: Title {test.currentTitleIndex + 1}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!user.hasReadAccess || !user.hasWriteAccess ? (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <Users className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Additional Permissions Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>To use all features, you need both read and write access to your YouTube account.</p>
                  <div className="mt-3 space-x-3">
                    {!user.hasReadAccess && (
                      <a
                        href="/auth/google/read"
                        className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm hover:bg-yellow-200"
                      >
                        Grant Read Access
                      </a>
                    )}
                    {!user.hasWriteAccess && (
                      <a
                        href="/auth/google/write"
                        className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm hover:bg-yellow-200"
                      >
                        Grant Write Access
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {showCreateModal && (
        <CreateTestModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['/api/tests/active'] });
          }}
        />
      )}
    </div>
  );
}

function CreateTestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [videoId, setVideoId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [titles, setTitles] = useState(['', '']);
  const [rotationInterval, setRotationInterval] = useState(1440);

  const createTestMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create test');
      return response.json();
    },
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validTitles = titles.filter(t => t.trim());
    if (validTitles.length < 2) {
      alert('Please provide at least 2 title variants');
      return;
    }

    createTestMutation.mutate({
      videoId: videoId.trim(),
      videoTitle: videoTitle.trim() || `Test for ${videoId}`,
      titleVariants: validTitles,
      rotationInterval,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Test</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video ID
            </label>
            <input
              type="text"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="dQw4w9WgXcQ"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video Title (Optional)
            </label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Awesome Video"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title Variants
            </label>
            {titles.map((title, index) => (
              <input
                key={index}
                type="text"
                value={title}
                onChange={(e) => {
                  const newTitles = [...titles];
                  newTitles[index] = e.target.value;
                  setTitles(newTitles);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                placeholder={`Title variant ${index + 1}`}
                required={index < 2}
              />
            ))}
            {titles.length < 5 && (
              <button
                type="button"
                onClick={() => setTitles([...titles, ''])}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add another variant
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rotation Interval
            </label>
            <select
              value={rotationInterval}
              onChange={(e) => setRotationInterval(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>24 hours (Midnight PST)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTestMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createTestMutation.isPending ? 'Creating...' : 'Create Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
