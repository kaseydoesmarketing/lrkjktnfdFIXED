import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authService } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import { Bell, Play, Search, Plus, Keyboard, Menu, X, User } from 'lucide-react';
import StatsCards from '@/components/StatsCards';
import TestsList from '@/components/TestsList';
import CreateTestModal from '@/components/CreateTestModal';
import ResultsDashboard from '@/components/ResultsDashboard';
import { useToast } from '@/hooks/use-toast';
import newLogo from "@assets/Untitled design (11)_1750353468294.png";

export default function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const { toast } = useToast();

  // Check for successful OAuth login and refresh auth state
  useEffect(() => {
    // Check for sessionToken in URL parameters from OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const sessionToken = urlParams.get('sessionToken');
    
    if (sessionToken) {
      console.log('OAuth login successful, storing session token');
      localStorage.setItem('sessionToken', sessionToken);
      
      // Clean up URL by removing the token parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('sessionToken');
      window.history.replaceState({}, '', url.pathname);
      
      // Show success toast
      toast({
        title: "Login Successful",
        description: "Welcome to TitleTesterPro! You're now connected to YouTube.",
      });
    }
    
    // Force refresh of auth query on dashboard load
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
  }, [toast]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if not in input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'n':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setIsCreateModalOpen(true);
            toast({
              title: 'Keyboard Shortcut',
              description: 'Opened create test modal',
            });
          }
          break;
        case '?':
          event.preventDefault();
          setShowKeyboardShortcuts(true);
          break;
        case 'Escape':
          setSelectedTestId(null);
          setShowKeyboardShortcuts(false);
          setIsMobileMenuOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast]);

  const handleLogout = async () => {
    await authService.logout();
    queryClient.clear();
  };

  const selectedTest = tests?.find((test: any) => test.id === selectedTestId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img src={newLogo} alt="TitleTesterPro" className="h-10 lg:h-12" />
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowKeyboardShortcuts(true)}
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </Button>
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
              <span className="text-sm font-medium text-gray-700 hidden xl:block">
                {user?.name || user?.email}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-800"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pt-4 border-t border-gray-700">
            <div className="flex flex-col space-y-4">
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
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="flex-1 justify-start"
                >
                  <Keyboard className="w-4 h-4 mr-2" />
                  Shortcuts
                </Button>
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
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
        )}
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">TitleTesterPro Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <StatsCards stats={stats} />

          {/* Video Selection Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="min-w-[200px]">
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option>Select YouTube Channel</option>
                  </select>
                </div>
              </div>
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                <span>New Test</span>
              </Button>
            </div>
          </div>
        </div>



        {/* Video Selection Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select video to test</h2>
          <div className="space-y-4">
            {/* Mock video entries - these would come from YouTube API */}
            <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center">
                <Play className="w-6 h-6 text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Sample Video Title</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                  <span>405 views</span>
                  <span>4 days old</span>
                </div>
              </div>
              <div className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                >
                  →
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Tests Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Active Title Tests</h2>
              <p className="text-sm text-gray-600">Monitor your ongoing title optimization experiments</p>
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
          
          {/* Example Title Test Display */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <h3 className="text-lg font-semibold text-gray-900">Sample A/B Test - Video Title Optimization</h3>
                <span className="text-sm text-gray-500">10 min Rotation</span>
              </div>
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                Cancel test
              </Button>
            </div>
            
            {/* Title Variants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Title A */}
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-700">Title A</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Pending</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">Sample Title Variant A for Testing</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">CTR</span>
                      <span className="font-medium">7.4%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Views</span>
                      <span className="font-medium">1,182</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Title B - Current */}
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">Title B</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Current</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">Sample Title Variant B Currently Active</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">CTR</span>
                      <span className="font-medium">3.6%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Views</span>
                      <span className="font-medium">773</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Title C */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Title C</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Pending</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">Sample Title Variant C for Testing</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">CTR</span>
                      <span className="font-medium">-</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Views</span>
                      <span className="font-medium">-</span>
                    </div>
                  </div>
                  <Button className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white">
                    + Generate Title With AI
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Test Description */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Title Variants</h4>
              <p className="text-sm text-gray-600">
                Enter 3-5 titles to A/B test. TitleTesterPro will automatically change your video's title on YouTube according to the rotation schedule. 
                Best click-through rate determines the winner.
              </p>
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

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-gray-800 border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">Keyboard Shortcuts</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowKeyboardShortcuts(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Create new test</span>
                  <Badge variant="secondary" className="text-xs">Ctrl + N</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Show shortcuts</span>
                  <Badge variant="secondary" className="text-xs">?</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Close modal/details</span>
                  <Badge variant="secondary" className="text-xs">Esc</Badge>
                </div>
                <div className="pt-4 border-t border-gray-600">
                  <p className="text-xs text-gray-500">
                    Shortcuts work when not typing in input fields
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
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
