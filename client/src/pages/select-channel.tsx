import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Youtube, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Channel {
  id: string;
  title: string;
  thumbnail?: string;
}

export default function SelectChannel() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/auth/channels', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }

      const data = await response.json();
      setChannels(data.channels || []);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      toast({
        title: "Error",
        description: "Failed to fetch YouTube channels. Please try logging in again.",
        variant: "destructive",
      });
      setLocation('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChannel = async (channelId: string, channelTitle: string) => {
    setSaving(true);
    
    try {
      const response = await fetch('/api/auth/save-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          channelId,
          channelTitle
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save channel');
      }

      toast({
        title: "Success",
        description: `Connected to ${channelTitle}`,
      });

      setLocation('/dashboard');
    } catch (error) {
      console.error('Failed to save channel:', error);
      toast({
        title: "Error",
        description: "Failed to save channel selection. Please try again.",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your YouTube channels...</p>
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Youtube className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle>No YouTube Channels Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center mb-4">
              We couldn't find any YouTube channels associated with your Google account.
            </p>
            <Button 
              onClick={() => setLocation('/login')}
              className="w-full"
            >
              Try Another Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Youtube className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Select Your YouTube Channel</CardTitle>
            <CardDescription className="text-lg mt-2">
              Choose which YouTube channel you'd like to use with TitleTesterPro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleSelectChannel(channel.id, channel.title)}
                  disabled={saving}
                  className="w-full p-4 bg-white border rounded-lg hover:border-blue-500 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-4">
                    {channel.thumbnail ? (
                      <img 
                        src={channel.thumbnail}
                        alt={channel.title}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <Youtube className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-lg">{channel.title}</h3>
                      <p className="text-sm text-gray-500">Channel ID: {channel.id}</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500 opacity-0 hover:opacity-100" />
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't see your channel? Make sure you're logged in with the correct Google account.
              </p>
              <Button 
                variant="outline"
                onClick={() => setLocation('/login')}
                className="mt-2"
              >
                Try Another Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}