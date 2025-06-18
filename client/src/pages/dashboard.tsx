import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import { Bell, Play } from 'lucide-react';
import StatsCards from '@/components/StatsCards';
import TestsList from '@/components/TestsList';
import CreateTestModal from '@/components/CreateTestModal';
import ResultsDashboard from '@/components/ResultsDashboard';

export default function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: () => authService.getCurrentUser(),
  });

  const { data: tests, isLoading: testsLoading } = useQuery({
    queryKey: ['/api/tests'],
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
  });

  const handleLogout = async () => {
    await authService.logout();
    queryClient.clear();
  };

  const selectedTest = tests?.find((test: any) => test.id === selectedTestId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Play className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-gray-900">TitleTesterPro</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-3">
              {user?.image && (
                <img 
                  src={user.image} 
                  alt="User avatar" 
                  className="w-8 h-8 rounded-full" 
                />
              )}
              <span className="text-sm font-medium text-gray-700">
                {user?.name || user?.email}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Manage your YouTube title A/B tests and track performance</p>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2"
            >
              <span className="text-xl">+</span>
              <span>Create New Test</span>
            </Button>
          </div>

          {/* Stats Overview */}
          <StatsCards stats={stats} />
        </div>

        {/* Active Tests Section */}
        <TestsList 
          tests={tests} 
          isLoading={testsLoading}
          onSelectTest={setSelectedTestId}
        />

        {/* Results Dashboard */}
        {selectedTest && (
          <ResultsDashboard 
            test={selectedTest} 
            onClose={() => setSelectedTestId(null)}
          />
        )}
      </div>

      {/* Create Test Modal */}
      <CreateTestModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
