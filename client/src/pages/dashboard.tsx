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
import newLogo from "@assets/Untitled design (11)_1750353468294.png";

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
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Header */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img src={newLogo} alt="TitleTesterPro" className="h-8" />
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
              <span className="text-sm font-medium text-gray-300">
                {user?.name || user?.email}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-200"
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-400">Manage your YouTube title A/B tests and track performance</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create New Test
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <StatsCards stats={stats} />
        </div>



        {/* Tests Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Your Title Tests</h2>
              <p className="text-sm text-gray-400">Manage and monitor your active title optimization tests</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tests..."
                  className="pl-8 pr-4 py-2 border border-gray-600 bg-gray-800 text-white rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <svg className="w-4 h-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select className="border border-gray-600 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500">
                <option>All Tests</option>
                <option>Active</option>
                <option>Paused</option>
                <option>Completed</option>
              </select>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                New Test
              </Button>
            </div>
          </div>
          
          <TestsList 
            tests={tests} 
            isLoading={testsLoading}
            onSelectTest={setSelectedTestId}
          />
        </div>

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
      
      <footer className="bg-gray-800 border-t border-gray-700 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center space-x-6">
              <a href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </a>
              <span className="text-gray-600">•</span>
              <a href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </a>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-400">
                © 2025 TitleTesterPro. All rights reserved.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Contact: <a href="mailto:kaseydoesmarketing@gmail.com" className="hover:text-gray-300">kaseydoesmarketing@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
