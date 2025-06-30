import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authService } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import { Bell, Play, Plus, User, Clock, ChevronRight, RotateCcw, Eye, MousePointer, TrendingUp, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const { toast } = useToast();

  // Check for successful OAuth login and refresh auth state
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionToken = urlParams.get('sessionToken');
    
    if (sessionToken) {
      console.log('OAuth login successful, storing session token');
      localStorage.setItem('sessionToken', sessionToken);
      
      const url = new URL(window.location.href);
      url.searchParams.delete('sessionToken');
      window.history.replaceState({}, '', url.pathname);
      
      toast({
        title: "Login Successful",
        description: "Welcome to TitleTesterPro! You're now connected to YouTube.",
      });
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
  }, [toast]);

  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: !!localStorage.getItem('sessionToken'),
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['/api/tests'],
    enabled: !!user,
  });

  const { data: recentVideos = [] } = useQuery({
    queryKey: ['/api/videos/recent'],
    enabled: !!user,
  });

  const activeTests = tests.filter((test: any) => test.status === 'active');
  const completedTests = tests.filter((test: any) => test.status === 'completed');

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ backgroundColor: '#f9fafb', color: '#111827', minHeight: '100vh' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4" style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-current" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Thumbnail Tester Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Bell className="w-5 h-5 text-gray-500" />
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-green-50 border-green-200" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CardContent className="p-6" style={{ padding: '1.5rem' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <TestTube className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Active Tests</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{activeTests.length}</div>
                </div>
                <div className="text-green-600 text-sm font-medium">%18</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">Total Views</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stats?.totalViews || 888}</div>
                </div>
                <div className="text-blue-600 text-sm font-medium">%18</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <MousePointer className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600">Average CTR</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stats?.avgCtr ? `${stats.avgCtr.toFixed(1)}%` : '4.7%'}</div>
                </div>
                <div className="text-purple-600 text-sm font-medium">-2%</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Eye className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">Completed</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{completedTests.length}</div>
                </div>
                <div className="text-orange-600 text-sm font-medium">+9%</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Channel Selector and New Test Button */}
        <div className="flex items-center justify-between mb-8">
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select YouTube Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="channel1">Main Channel</SelectItem>
              <SelectItem value="channel2">Secondary Channel</SelectItem>
            </SelectContent>
          </Select>
          
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Test
          </Button>
        </div>

        {/* Video Selection Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select video to test</h2>
          <div className="space-y-4">
            {recentVideos.slice(0, 2).map((video: any, index: number) => (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img 
                        src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                        alt="Video thumbnail" 
                        className="w-32 h-18 object-cover rounded"
                      />
                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                        {video.duration || '4:05'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{video.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          {video.viewCount || '405'} views
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {video.publishedAt || '4 days ago'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{video.description || 'What if i told your Diddy\'s walking fart is about Cassie and Diddy, i dreak Todd/k about a better...'}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Active Test Section */}
        {activeTests.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                This Diddy Story Proves Cancel Culture is a Lie
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <RotateCcw className="w-4 h-4" />
                <span>10 min Rotation</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Title A */}
              <Card className="border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">Title A</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-4">Y'all Cancel Everybody But Diddy?</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">CTR</span>
                      <span className="text-sm font-medium">7.4%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Views</span>
                      <span className="text-sm font-medium">1,182</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Title B */}
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">Title B</span>
                    <Badge className="bg-green-500 text-white text-xs">Current</Badge>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-4">Nobody Wants to Admit This About Cassie and Diddy</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">CTR</span>
                      <span className="text-sm font-medium">8.6%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Views</span>
                      <span className="text-sm font-medium">773</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Title C */}
              <Card className="border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">Title C</span>
                    <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">Pending</Badge>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-4">if Diddy Walks, It's Proof This System Ain't Built for Us</h3>
                  <div className="text-center py-8">
                    <Button variant="outline" className="text-blue-600 border-blue-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Generate Title With AI
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Title Variants Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Title Variants</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter 3-5 titles to A/B test. TitleTesterPro will automatically change your video's title on YouTube according to the rotation schedule. Best click-through rate determines the winner.
              </p>
              <Button variant="outline" className="text-blue-600 border-blue-600">
                Cancel test
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}