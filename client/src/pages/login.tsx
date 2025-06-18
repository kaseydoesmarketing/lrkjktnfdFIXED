import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Play, Youtube, BarChart3, TrendingUp, TestTube } from 'lucide-react';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      // Mock Google OAuth - in production this would be handled by Google OAuth flow
      await authService.loginWithGoogle({
        email,
        name: name || email.split('@')[0],
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });

      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Success',
        description: 'Successfully logged in!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to login. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Features */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                <Youtube className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">TitleTesterPro</h1>
                <p className="text-gray-600">Optimize your YouTube titles with data-driven A/B testing</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TestTube className="text-blue-600 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Automated A/B Testing</h3>
                <p className="text-gray-600 text-sm">Test multiple title variants automatically with customizable rotation intervals</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="text-green-600 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Real-time Analytics</h3>
                <p className="text-gray-600 text-sm">Track CTR, views, and engagement metrics to identify winning titles</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="text-purple-600 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Performance Optimization</h3>
                <p className="text-gray-600 text-sm">Increase click-through rates and video performance with data-backed decisions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold">Connect Your YouTube Account</CardTitle>
            <p className="text-gray-600 text-sm">Start optimizing your video titles today</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">YouTube Account Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.youtube@gmail.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Channel Name (Optional)</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Channel Name"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={isLoading || !email}
              >
                <Youtube className="w-4 h-4 mr-2" />
                {isLoading ? 'Connecting...' : 'Connect YouTube Account'}
              </Button>
            </form>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Demo Version:</strong> This connects to a demo environment. 
                In production, this would securely integrate with Google OAuth and YouTube Data API v3.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
